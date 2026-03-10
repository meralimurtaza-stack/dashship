import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import anthropic

from app.config import settings

router = APIRouter(prefix="/api/data", tags=["data"])


# ── Request / Response Models ────────────────────────────────────

class ColumnInfo(BaseModel):
    name: str
    display_name: str | None = None
    type: str  # number, string, date, boolean
    role: str  # dimension, measure
    sample_values: list[str] = []
    null_count: int = 0
    null_percent: float = 0
    unique_count: int | None = None


class ProfilePayload(BaseModel):
    columns: list[ColumnInfo]
    row_count: int
    file_name: str | None = None


class Suggestion(BaseModel):
    id: str
    action: str  # rename, change_type, change_role
    column: str
    from_value: str
    to_value: str
    reason: str


class SuggestionsResponse(BaseModel):
    suggestions: list[Suggestion]


# ── Claude Prompt ────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a data analyst reviewing a dataset profile. Your job is to suggest improvements to field names, data types, and dimension/measure classifications.

Rules:
- Suggest renaming fields that use abbreviations, codes, or unclear names to human-readable names
- Suggest type corrections when sample values don't match the detected type
- Suggest reclassifying dimensions that should be measures (e.g. numeric IDs counted, not summed) or measures that should be dimensions (e.g. category codes detected as numbers)
- Be concise in your reasons — one sentence max
- Only suggest changes that genuinely improve clarity or correctness
- Do NOT suggest changes for fields that are already clear and correctly typed
- Return between 0 and 10 suggestions maximum

Return a JSON array of suggestion objects. Each object must have exactly these fields:
- "action": one of "rename", "change_type", "change_role"
- "column": the original column name (exact match)
- "from": current value (current name, type, or role)
- "to": suggested value (new name, type, or role)
- "reason": one-sentence explanation

Return ONLY the JSON array, no markdown, no code fences, no explanation."""


def build_user_prompt(payload: ProfilePayload) -> str:
    lines = [f"Dataset: {payload.file_name or 'Untitled'} ({payload.row_count:,} rows)\n"]
    lines.append("Columns:")
    for col in payload.columns:
        name = col.display_name or col.name
        parts = [
            f"  - {name} (original: {col.name})" if col.display_name and col.display_name != col.name else f"  - {col.name}",
            f"type={col.type}",
            f"role={col.role}",
        ]
        if col.unique_count is not None:
            parts.append(f"unique={col.unique_count}")
        if col.null_percent > 0:
            parts.append(f"nulls={col.null_percent:.1f}%")
        if col.sample_values:
            samples = ", ".join(col.sample_values[:5])
            parts.append(f'samples=[{samples}]')
        lines.append(" | ".join(parts))
    return "\n".join(lines)


# ── Endpoint ─────────────────────────────────────────────────────

@router.post("/suggestions", response_model=SuggestionsResponse)
async def get_suggestions(payload: ProfilePayload):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    user_prompt = build_user_prompt(payload)

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )

        raw_text = message.content[0].text.strip()
        # Strip markdown fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[1] if "\n" in raw_text else raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3].strip()

        raw_suggestions = json.loads(raw_text)

        suggestions = []
        for i, s in enumerate(raw_suggestions):
            suggestions.append(Suggestion(
                id=f"sug_{i}",
                action=s.get("action", "rename"),
                column=s.get("column", ""),
                from_value=s.get("from", ""),
                to_value=s.get("to", ""),
                reason=s.get("reason", ""),
            ))

        return SuggestionsResponse(suggestions=suggestions)

    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Failed to parse AI response")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude API error: {str(e)}")
