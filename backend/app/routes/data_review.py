import json
import re
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import anthropic

from app.config import settings

router = APIRouter(prefix="/api/data-review", tags=["data-review"])


# ── Models ───────────────────────────────────────────────────────

class ColumnContext(BaseModel):
    name: str
    display_name: str | None = None
    type: str
    role: str
    sample_values: list[str] = []


class DataContext(BaseModel):
    source_name: str
    row_count: int
    columns: list[ColumnContext]


class Recommendation(BaseModel):
    id: str
    type: str  # "rename" | "reclassify" | "type_change" | "hide"
    field: str
    to: str | None = None
    from_role: str | None = None
    to_role: str | None = None
    from_type: str | None = None
    to_type: str | None = None
    reason: str


class DataReviewResponse(BaseModel):
    summary: str
    recommendations: list[Recommendation]


# ── System Prompt ────────────────────────────────────────────────

DATA_ENGINEER_SYSTEM_PROMPT = """You are a strict data engineer reviewing a dataset for a dashboard tool. Examine EVERY field and flag ANY issues.

MANDATORY CHECKS — apply ALL of these to every field:

1. RENAME: Any field name that isn't plain English suitable for a dashboard header. Examples:
   - Snake_case or camelCase → "order_date" should be "Order Date"
   - Abbreviations → "Dept." should be "Department", "A/C Ref" should be "Account Reference"
   - Technical names → "inv_ref" should be "Invoice Reference", "Tran No." should be "Transaction Number"
   - tmp, temp, or auto-generated names → flag for rename

2. RECLASSIFY: Any numeric field that is actually an identifier, not a value to aggregate:
   - Field names containing: ID, No, No., Ref, Code, Number, Key, Index (case-insensitive)
   - Fields with high cardinality relative to row count (many unique values = likely an ID)
   - These should be dimensions, not measures

3. TYPE_CHANGE: Fields with wrong types:
   - Boolean columns (T/F, True/False, Yes/No, 0/1) classified as strings → should be boolean
   - Date-like strings → should be date type
   - Numeric strings → should be number type

4. HIDE: Fields with no analytical value:
   - Columns named __EMPTY, __EMPTY_1, Unnamed, Column1, etc → ALWAYS hide these
   - Columns with 100% null values → ALWAYS hide
   - Columns with >80% null values → recommend hide
   - Columns with only 1 unique value → hide (no variation = no insight)
   - Auto-increment indices or internal IDs with no business meaning

BE AGGRESSIVE. It is better to over-recommend than to miss problems. For a dataset with 20 fields, you should typically find 3-8 recommendations. Finding 0 is almost always wrong.

First, think through each field in a <thinking> block. For each field, state what you see and whether it needs a recommendation. Then output your recommendations as JSON.

Output format (after your thinking):

```json
{"summary": "Your [source] data has [N] fields. I found [M] things to clean up:", "recommendations": [{"id": "rec_1", "type": "rename|reclassify|type_change|hide", "field": "ExactFieldName", "to": "New Name", "from_role": "measure", "to_role": "dimension", "from_type": "string", "to_type": "date", "reason": "One sentence explanation"}]}
```

Only include the fields relevant to each recommendation type (e.g. "to" only for renames, "from_role"/"to_role" only for reclassify).
Use the EXACT field names from the schema. Never invent or guess names.
Each recommendation must have a unique "id" field like "rec_1", "rec_2", etc.
Be concise — one sentence per recommendation explaining WHY.
NEVER mention dashboards, charts, KPIs, or analysis. You only talk about the data itself."""


# ── Helpers ──────────────────────────────────────────────────────

def build_schema_description(ctx: DataContext) -> str:
    lines = [f"Dataset: {ctx.source_name}", f"Rows: {ctx.row_count:,}", "", "Fields:"]
    for c in ctx.columns:
        samples = ", ".join(c.sample_values[:5]) if c.sample_values else "—"
        unique_count = len(set(c.sample_values)) if c.sample_values else "unknown"
        lines.append(
            f"  - {c.name} (type: {c.type}, role: {c.role}, "
            f"unique_samples: {unique_count}) — samples: {samples}"
        )
    return "\n".join(lines)


def extract_json_from_response(text: str) -> dict:
    """Extract JSON from Claude's response, handling thinking blocks and code fences."""
    # Try to find JSON after </thinking> tag
    after_thinking = text
    thinking_end = text.find("</thinking>")
    if thinking_end != -1:
        after_thinking = text[thinking_end + len("</thinking>"):]

    # Try to find ```json ... ``` block
    json_block_match = re.search(r"```json\s*([\s\S]*?)```", after_thinking)
    if json_block_match:
        return json.loads(json_block_match.group(1).strip())

    # Try to find a JSON object with "recommendations" key
    json_obj_match = re.search(r'\{[\s\S]*"recommendations"[\s\S]*\}', after_thinking)
    if json_obj_match:
        # Find the balanced braces
        candidate = json_obj_match.group(0)
        # Try parsing progressively shorter substrings from the end
        for end in range(len(candidate), 0, -1):
            try:
                return json.loads(candidate[:end])
            except json.JSONDecodeError:
                continue

    # Last resort: try the whole text after thinking
    return json.loads(after_thinking.strip())


# ── Endpoint ─────────────────────────────────────────────────────

@router.post("", response_model=DataReviewResponse)
async def data_review(ctx: DataContext):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    schema_desc = build_schema_description(ctx)

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4096,
            system=DATA_ENGINEER_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": schema_desc}],
        )

        raw = response.content[0].text.strip()
        parsed = extract_json_from_response(raw)

        return DataReviewResponse(
            summary=parsed.get("summary", "Review complete."),
            recommendations=[
                Recommendation(**rec) for rec in parsed.get("recommendations", [])
            ],
        )
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as e:
        print(f"[data-review] Failed to parse response: {e}")
        return DataReviewResponse(
            summary="Review complete.",
            recommendations=[],
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude API error: {str(e)}")
