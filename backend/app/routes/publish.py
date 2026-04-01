import hashlib
import secrets
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

try:
    from supabase import create_client
    supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
    HAS_SUPABASE = True
except Exception:
    supabase = None
    HAS_SUPABASE = False

router = APIRouter(prefix="/api", tags=["publish"])

# ── In-memory store (fallback when Supabase not available) ────

_published: dict[str, dict[str, Any]] = {}


# ── Models ────────────────────────────────────────────────────────

class BrandingConfig(BaseModel):
    logo_url: str | None = None
    primary_color: str | None = "#0E0D0D"
    font_family: str | None = "IBM Plex Sans"
    powered_by_dashship: bool = True


class PublishRequest(BaseModel):
    dashboard_name: str
    slug: str
    access_level: str = "public"  # public | password | invited
    password: str | None = None
    allowed_emails: list[str] | None = None
    branding: BrandingConfig = BrandingConfig()
    embed_enabled: bool = True
    jsx_code: str
    data: list[dict[str, Any]]
    user_id: str | None = None
    project_id: str | None = None
    dashboard_id: str | None = None  # Link to dashboards table


class AuthRequest(BaseModel):
    password: str


# ── Helpers ───────────────────────────────────────────────────────

def _hash_password(pw: str) -> str:
    salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}:{pw}".encode()).hexdigest()
    return f"{salt}:{hashed}"


def _verify_password(pw: str, stored: str) -> bool:
    salt, hashed = stored.split(":", 1)
    return hashlib.sha256(f"{salt}:{pw}".encode()).hexdigest() == hashed


# ── Routes ────────────────────────────────────────────────────────

@router.post("/publish")
async def publish_dashboard(req: PublishRequest):
    """Save a published dashboard configuration."""
    slug = req.slug.strip().lower().replace(" ", "-")
    if not slug:
        raise HTTPException(400, "Slug is required")

    if not req.user_id:
        raise HTTPException(400, "user_id is required for publishing")

    password_hash = _hash_password(req.password) if req.access_level == "password" and req.password else None
    now = datetime.utcnow().isoformat()

    record = {
        "slug": slug,
        "dashboard_name": req.dashboard_name,
        "user_id": req.user_id,
        "access_level": req.access_level,
        "password_hash": password_hash,
        "allowed_emails": req.allowed_emails or [],
        "branding": req.branding.model_dump(),
        "embed_enabled": req.embed_enabled,
        "jsx_code": req.jsx_code,
        "data": req.data,
        "published_at": now,
        "updated_at": now,
    }
    if req.project_id:
        record["project_id"] = req.project_id

    if HAS_SUPABASE:
        try:
            # Check if this slug already exists (republish = version bump)
            existing = None
            try:
                result = supabase.table("published_dashboards").select(
                    "id, version, jsx_code"
                ).eq("slug", slug).single().execute()
                existing = result.data
            except Exception:
                pass

            if existing:
                # Republish: increment version, save previous JSX for undo
                record["version"] = (existing.get("version") or 1) + 1
                record["previous_jsx"] = existing.get("jsx_code", "")
                # Don't overwrite created_at on republish
                result = supabase.table("published_dashboards").update(
                    record
                ).eq("slug", slug).execute()
            else:
                # First publish
                record["version"] = 1
                record["created_at"] = now
                result = supabase.table("published_dashboards").insert(
                    record
                ).execute()

            if result.data:
                published = result.data[0]
                # Also update the dashboards table if dashboard_id provided
                if req.dashboard_id:
                    try:
                        supabase.table("dashboards").update({
                            "status": "published",
                            "published_slug": slug,
                            "published_at": now,
                            "updated_at": now,
                        }).eq("id", req.dashboard_id).execute()
                    except Exception as e:
                        print(f"[publish] Failed to update dashboards table: {e}")

                return {
                    "slug": slug,
                    "url": f"/view/{slug}",
                    "version": published.get("version", 1),
                }
        except Exception as e:
            print(f"[publish] Supabase error: {e}, using in-memory store")

    # In-memory fallback
    _published[slug] = record
    return {"slug": slug, "url": f"/view/{slug}", "version": 1}


@router.get("/view/{slug}")
async def get_published_dashboard(slug: str):
    """Return published dashboard config for the viewer."""
    record = None

    if HAS_SUPABASE:
        try:
            result = supabase.table("published_dashboards").select("*").eq("slug", slug).single().execute()
            record = result.data
        except Exception:
            pass

    if not record:
        record = _published.get(slug)

    if not record:
        raise HTTPException(404, "Dashboard not found")

    requires_auth = record.get("access_level") == "password"

    base = {
        "id": record.get("id", slug),
        "slug": slug,
        "dashboard_name": record["dashboard_name"],
        "access_level": record["access_level"],
        "branding": record["branding"],
        "version": record.get("version", 1),
        "published_at": record.get("published_at"),
    }

    if requires_auth:
        return {**base, "jsx_code": "", "data": [], "requires_auth": True}

    return {
        **base,
        "jsx_code": record["jsx_code"],
        "data": record["data"],
        "requires_auth": False,
    }


@router.post("/view/{slug}/auth")
async def authenticate_viewer(slug: str, req: AuthRequest):
    """Validate password for a protected dashboard."""
    record = None

    if HAS_SUPABASE:
        try:
            result = supabase.table("published_dashboards").select("*").eq("slug", slug).single().execute()
            record = result.data
        except Exception:
            pass

    if not record:
        record = _published.get(slug)

    if not record:
        raise HTTPException(404, "Dashboard not found")

    if record.get("access_level") != "password":
        return {"authenticated": True, "dashboard": _build_dashboard_response(record, slug)}

    stored_hash = record.get("password_hash", "")
    if not stored_hash or not _verify_password(req.password, stored_hash):
        raise HTTPException(401, "Incorrect password")

    return {"authenticated": True, "dashboard": _build_dashboard_response(record, slug)}


def _build_dashboard_response(record: dict, slug: str) -> dict:
    return {
        "id": record.get("id", slug),
        "slug": slug,
        "dashboard_name": record["dashboard_name"],
        "access_level": record["access_level"],
        "branding": record["branding"],
        "jsx_code": record["jsx_code"],
        "data": record["data"],
        "version": record.get("version", 1),
        "published_at": record.get("published_at"),
        "requires_auth": False,
    }
