from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api/email", tags=["email"])

# ── In-memory store ───────────────────────────────────────────────

_schedules: dict[str, dict[str, Any]] = {}


# ── Models ────────────────────────────────────────────────────────

class EmailScheduleRequest(BaseModel):
    dashboard_id: str
    recipients: list[str]
    frequency: str = "weekly"  # daily | weekly | monthly
    day_of_week: int | None = None  # 0-6 for weekly
    day_of_month: int | None = None  # 1-28 for monthly
    time_utc: str = "09:00"
    format: str = "html"  # html | pdf
    subject: str
    enabled: bool = True


# ── Helpers ───────────────────────────────────────────────────────

def _build_html_email(dashboard_name: str, dashboard_url: str) -> str:
    """Generate a DashShip-branded HTML email template for a dashboard report."""
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {{ font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif; background: #FAFAF8; margin: 0; padding: 0; color: #0E0D0D; }}
    .wrapper {{ padding: 32px 16px; background: #FAFAF8; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e5e3; }}
    .header {{ padding: 32px 32px 24px; border-bottom: 1px solid #e5e5e3; }}
    .header h1 {{ font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 18px; font-weight: 600; color: #0E0D0D; margin: 0 0 4px; }}
    .header p {{ font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1a0; margin: 0; }}
    .content {{ padding: 32px; }}
    .content p {{ font-size: 14px; color: #525252; line-height: 1.6; margin: 0 0 24px; }}
    .cta {{ display: inline-block; padding: 14px 28px; background: #0E0D0D; color: #ffffff !important; font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; text-decoration: none; }}
    .footer {{ padding: 24px 32px; border-top: 1px solid #e5e5e3; text-align: center; }}
    .footer p {{ font-family: 'IBM Plex Mono', 'Courier New', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #a1a1a0; margin: 0; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <p>Dashboard Report</p>
        <h1>{dashboard_name}</h1>
      </div>
      <div class="content">
        <p>Your scheduled dashboard report is ready. Click below to view the latest data.</p>
        <a href="{dashboard_url}" class="cta">View Dashboard</a>
      </div>
      <div class="footer">
        <p>Powered by DashShip</p>
      </div>
    </div>
  </div>
</body>
</html>"""


async def _send_via_resend(to: list[str], subject: str, html: str) -> bool:
    """Send email via Resend API. Returns True on success."""
    resend_key = settings.resend_api_key
    if not resend_key:
        print("[email] RESEND_API_KEY not set — email not actually sent (dev mode)")
        print(f"[email] Would send to: {to}")
        print(f"[email] Subject: {subject}")
        return True  # Return success for local dev

    import httpx
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": settings.resend_from_email,
                    "to": to,
                    "subject": subject,
                    "html": html,
                },
            )
            if resp.status_code in (200, 201):
                print(f"[email] Sent successfully to {to}")
                return True
            else:
                print(f"[email] Resend API error {resp.status_code}: {resp.text}")
                return False
    except Exception as e:
        print(f"[email] Send error: {e}")
        return False


# ── Routes ────────────────────────────────────────────────────────

@router.post("/schedule")
async def save_email_schedule(req: EmailScheduleRequest):
    """Save or update an email schedule for a dashboard."""
    if not req.recipients:
        raise HTTPException(400, "At least one recipient is required")

    schedule_id = f"{req.dashboard_id}-schedule"
    record = {
        "id": schedule_id,
        "dashboard_id": req.dashboard_id,
        "recipients": req.recipients,
        "frequency": req.frequency,
        "day_of_week": req.day_of_week,
        "day_of_month": req.day_of_month,
        "time_utc": req.time_utc,
        "format": req.format,
        "subject": req.subject,
        "enabled": req.enabled,
        "created_at": datetime.utcnow().isoformat(),
    }

    _schedules[schedule_id] = record
    return {"id": schedule_id}


@router.post("/send-test")
async def send_test_email(req: EmailScheduleRequest):
    """Send a test email immediately."""
    if not req.recipients:
        raise HTTPException(400, "At least one recipient is required")

    dashboard_name = req.subject.split("—")[0].strip() if "—" in req.subject else req.subject
    dashboard_url = f"{settings.app_url}/view/{req.dashboard_id}"
    html = _build_html_email(dashboard_name, dashboard_url)

    success = await _send_via_resend(req.recipients, f"[Test] {req.subject}", html)

    if not success:
        raise HTTPException(500, "Failed to send email — check RESEND_API_KEY and sender domain")

    return {"success": True}
