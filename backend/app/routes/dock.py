"""
Dock routes — the branded page where all of a user's published dashboards live.

Every user gets one Dock at /dock/[slug]. The slug is auto-generated from
their display name on first publish.
"""

import re
import secrets
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from app.config import settings

try:
    from supabase import create_client
    supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
    HAS_SUPABASE = True
except Exception:
    supabase = None
    HAS_SUPABASE = False

router = APIRouter(prefix="/api/dock", tags=["dock"])

# ── In-memory fallback ────────────────────────────────────────────

_docks: dict[str, dict[str, Any]] = {}


# ── Models ────────────────────────────────────────────────────────

class CreateDockRequest(BaseModel):
    user_id: str
    display_name: str


class UpdateDockRequest(BaseModel):
    display_name: str | None = None
    logo_url: str | None = None


# ── Helpers ───────────────────────────────────────────────────────

def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug[:60] if slug else "dashboard"


def _generate_unique_slug(base_slug: str) -> str:
    """Generate a unique slug, appending a random suffix on collision."""
    slug = base_slug

    if HAS_SUPABASE:
        try:
            result = supabase.table("docks").select("id").eq("slug", slug).execute()
            if result.data:
                slug = f"{base_slug}-{secrets.token_hex(2)}"
        except Exception:
            pass
    else:
        if slug in _docks:
            slug = f"{base_slug}-{secrets.token_hex(2)}"

    return slug


# ── Routes ────────────────────────────────────────────────────────

@router.post("/create")
async def create_dock(req: CreateDockRequest):
    """Create a dock for a user. Called on first publish."""
    # Check if user already has a dock
    if HAS_SUPABASE:
        try:
            existing = supabase.table("docks").select("*").eq("user_id", req.user_id).execute()
            if existing.data and len(existing.data) > 0:
                dock = existing.data[0]
                return {
                    "id": dock["id"],
                    "slug": dock["slug"],
                    "display_name": dock["display_name"],
                    "logo_url": dock.get("logo_url"),
                }
        except Exception as e:
            print(f"[dock] Supabase check error: {e}")
    else:
        for slug, dock in _docks.items():
            if dock["user_id"] == req.user_id:
                return {
                    "id": dock.get("id", slug),
                    "slug": slug,
                    "display_name": dock["display_name"],
                    "logo_url": dock.get("logo_url"),
                }

    # Generate unique slug
    base_slug = _slugify(req.display_name)
    slug = _generate_unique_slug(base_slug)

    record = {
        "user_id": req.user_id,
        "slug": slug,
        "display_name": req.display_name,
        "logo_url": None,
        "created_at": datetime.utcnow().isoformat(),
    }

    if HAS_SUPABASE:
        try:
            result = supabase.table("docks").insert(record).execute()
            if result.data:
                dock = result.data[0]
                return {
                    "id": dock["id"],
                    "slug": dock["slug"],
                    "display_name": dock["display_name"],
                    "logo_url": dock.get("logo_url"),
                }
        except Exception as e:
            print(f"[dock] Supabase insert error: {e}, using in-memory")

    # In-memory fallback
    _docks[slug] = record
    return {
        "id": slug,
        "slug": slug,
        "display_name": req.display_name,
        "logo_url": None,
    }


@router.get("/by-user/{user_id}")
async def get_dock_by_user(user_id: str):
    """Get a user's dock by their user ID."""
    if HAS_SUPABASE:
        try:
            result = supabase.table("docks").select("*").eq("user_id", user_id).execute()
            if result.data and len(result.data) > 0:
                dock = result.data[0]
                return {
                    "id": dock["id"],
                    "slug": dock["slug"],
                    "display_name": dock["display_name"],
                    "logo_url": dock.get("logo_url"),
                }
        except Exception:
            pass

    # In-memory fallback
    for slug, dock in _docks.items():
        if dock["user_id"] == user_id:
            return {
                "id": dock.get("id", slug),
                "slug": slug,
                "display_name": dock["display_name"],
                "logo_url": dock.get("logo_url"),
            }

    return None


@router.get("/{slug}")
async def get_dock(slug: str):
    """Public endpoint: Get a dock by its slug, including all published dashboards."""
    dock = None

    if HAS_SUPABASE:
        try:
            result = supabase.table("docks").select("*").eq("slug", slug).execute()
            if result.data and len(result.data) > 0:
                dock = result.data[0]
        except Exception:
            pass

    if not dock:
        dock = _docks.get(slug)

    if not dock:
        raise HTTPException(404, "Dock not found")

    user_id = dock["user_id"]

    # Fetch all published dashboards for this user
    dashboards = []
    if HAS_SUPABASE:
        try:
            result = (
                supabase.table("published_dashboards")
                .select("id, slug, dashboard_name, branding, created_at, updated_at, published_at, access_level, version")
                .eq("user_id", user_id)
                .order("updated_at", desc=True)
                .execute()
            )
            dashboards = result.data or []
        except Exception as e:
            print(f"[dock] Error fetching dashboards: {e}")

    # In-memory fallback: check the publish module's in-memory store
    if not dashboards:
        try:
            from app.routes.publish import _published
            for slug_key, record in _published.items():
                if record.get("user_id") == user_id:
                    dashboards.append({
                        "id": record.get("id", slug_key),
                        "slug": slug_key,
                        "dashboard_name": record["dashboard_name"],
                        "branding": record.get("branding", {}),
                        "created_at": record.get("created_at"),
                        "updated_at": record.get("updated_at"),
                        "access_level": record.get("access_level", "public"),
                    })
        except ImportError:
            pass

    return {
        "id": dock.get("id", slug),
        "slug": slug,
        "display_name": dock["display_name"],
        "logo_url": dock.get("logo_url"),
        "user_id": user_id,
        "dashboards": [
            {
                "id": d.get("id", d["slug"]),
                "slug": d["slug"],
                "dashboardName": d["dashboard_name"],
                "branding": d.get("branding", {}),
                "createdAt": d.get("created_at"),
                "updatedAt": d.get("updated_at"),
                "publishedAt": d.get("published_at"),
                "accessLevel": d.get("access_level", "public"),
                "version": d.get("version", 1),
            }
            for d in dashboards
        ],
    }


@router.patch("/{slug}")
async def update_dock(slug: str, req: UpdateDockRequest):
    """Update dock settings (display name, logo)."""
    updates: dict[str, Any] = {}
    if req.display_name is not None:
        updates["display_name"] = req.display_name
    if req.logo_url is not None:
        updates["logo_url"] = req.logo_url

    if not updates:
        raise HTTPException(400, "No fields to update")

    if HAS_SUPABASE:
        try:
            result = (
                supabase.table("docks")
                .update(updates)
                .eq("slug", slug)
                .execute()
            )
            if result.data:
                dock = result.data[0]
                return {
                    "id": dock["id"],
                    "slug": dock["slug"],
                    "display_name": dock["display_name"],
                    "logo_url": dock.get("logo_url"),
                }
        except Exception as e:
            print(f"[dock] Update error: {e}")

    # In-memory fallback
    if slug in _docks:
        _docks[slug].update(updates)
        dock = _docks[slug]
        return {
            "id": dock.get("id", slug),
            "slug": slug,
            "display_name": dock["display_name"],
            "logo_url": dock.get("logo_url"),
        }

    raise HTTPException(404, "Dock not found")


@router.post("/upload-logo")
async def upload_logo(file: UploadFile = File(...), dock_slug: str = Form(...)):
    """Upload a logo image to Supabase Storage."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "File must be an image")

    # Read file content
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:  # 5MB limit
        raise HTTPException(400, "File too large (max 5MB)")

    # Generate a unique filename
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
    filename = f"{dock_slug}-{secrets.token_hex(4)}.{ext}"

    if HAS_SUPABASE:
        try:
            # Upload to Supabase Storage — path is relative to bucket root
            supabase.storage.from_("dock-logos").upload(
                filename,
                content,
                {"content-type": file.content_type, "upsert": "true"},
            )
            # Get public URL
            logo_url = supabase.storage.from_("dock-logos").get_public_url(filename)

            # Update the dock record in Supabase
            try:
                supabase.table("docks").update({"logo_url": logo_url}).eq("slug", dock_slug).execute()
            except Exception:
                pass

            # Also update in-memory if it exists
            if dock_slug in _docks:
                _docks[dock_slug]["logo_url"] = logo_url

            return {"logo_url": logo_url}
        except Exception as e:
            print(f"[dock] Logo upload error: {e}")
            # Fall through to in-memory/base64 fallback

    # Fallback: store as base64 data URI when Supabase Storage isn't available
    import base64
    b64 = base64.b64encode(content).decode("utf-8")
    logo_url = f"data:{file.content_type};base64,{b64}"

    # Update in-memory dock
    if dock_slug in _docks:
        _docks[dock_slug]["logo_url"] = logo_url

    # Also try updating Supabase table (even if storage failed)
    if HAS_SUPABASE:
        try:
            supabase.table("docks").update({"logo_url": logo_url}).eq("slug", dock_slug).execute()
        except Exception:
            pass

    return {"logo_url": logo_url}
