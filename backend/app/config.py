import os
from pathlib import Path

from pydantic_settings import BaseSettings

# ── Resolve .env relative to this file, not CWD ──────────────────
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_role_key: str = ""
    anthropic_api_key: str = ""
    resend_api_key: str = ""
    resend_from_email: str = "DashShip <reports@dashship.io>"
    app_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,https://dashship-meralimurtaza-stacks-projects.vercel.app,https://dashship.vercel.app"

    model_config = {
        "env_file": str(_ENV_FILE),
        "env_file_encoding": "utf-8",
    }

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


def _load_settings() -> Settings:
    """Load settings, falling back to .env file values when shell env vars
    are set to empty strings (which would otherwise override .env)."""
    s = Settings()

    # If the shell has ANTHROPIC_API_KEY="" (empty), pydantic-settings uses
    # that empty value instead of the .env file value. Fix it here.
    if not s.anthropic_api_key and _ENV_FILE.exists():
        from dotenv import dotenv_values
        env_vals = dotenv_values(_ENV_FILE)
        if env_vals.get("ANTHROPIC_API_KEY"):
            # Bypass frozen model by using object.__setattr__
            object.__setattr__(s, "anthropic_api_key", env_vals["ANTHROPIC_API_KEY"])

    return s


settings = _load_settings()
