import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import anthropic

from app.config import settings

router = APIRouter(prefix="/api/generate", tags=["generate"])


# ── Models ───────────────────────────────────────────────────────

class ColumnContext(BaseModel):
    name: str
    display_name: str | None = None
    type: str
    role: str
    sample_values: list[str] = []


class DataContext(BaseModel):
    source_name: str
    source_id: str
    row_count: int
    columns: list[ColumnContext]


class CalculatedFieldInput(BaseModel):
    name: str
    formula: str


class GenerateRequest(BaseModel):
    data_context: DataContext
    conversation_summary: str = ""
    calculated_fields: list[CalculatedFieldInput] = []
    plan_spec: dict | None = None


# ── Validation ───────────────────────────────────────────────────

VALID_MARK_TYPES = {"bar", "line", "area", "scatter", "pie", "text", "table"}
VALID_AGGREGATIONS = {"sum", "avg", "count", "min", "max", "none", "count_distinct"}


def validate_plan_spec(plan_spec: dict, field_names: set[str]) -> list[str]:
    """Validate field references in a plan spec against the data profile."""
    warnings = []

    # Collect calculated field names from the spec
    calc_names = set()
    for cf in plan_spec.get("calculatedFields", []):
        calc_names.add(cf.get("name", ""))

    all_fields = field_names | calc_names

    for sheet in plan_spec.get("sheets", []):
        sid = sheet.get("id", "unknown")

        # Validate x, y, color bindings
        for key in ["x", "y", "color"]:
            binding = sheet.get(key)
            if binding and isinstance(binding, dict):
                field = binding.get("field", "")
                if field and field not in all_fields:
                    warnings.append(f"Sheet {sid}: unknown field '{field}' in {key}")

        # Validate table columns
        for col in sheet.get("columns", []):
            if col not in all_fields:
                warnings.append(f"Sheet {sid}: unknown column '{col}'")

        # Validate kpi metrics
        for metric in sheet.get("metrics", []):
            field = metric.get("field", "")
            if field and field not in all_fields:
                warnings.append(f"Sheet {sid}: unknown metric field '{field}'")

    return warnings


def validate_legacy_response(data: dict, column_names: set[str]) -> list[str]:
    """Validate generated JSON from legacy flow. Returns list of warnings."""
    warnings = []

    if "sheets" not in data:
        warnings.append("Missing 'sheets' array")
        return warnings

    if "layout" not in data:
        warnings.append("Missing 'layout' object")

    sheet_ids = set()
    for i, sheet in enumerate(data.get("sheets", [])):
        sid = sheet.get("id", f"sheet-{i+1}")
        sheet_ids.add(sid)

        mt = sheet.get("markType", "")
        if mt not in VALID_MARK_TYPES:
            warnings.append(f"Sheet {sid}: invalid markType '{mt}'")

        enc = sheet.get("encoding", {})
        for key in ["columns", "rows", "color", "size", "label"]:
            binding = enc.get(key)
            if binding and isinstance(binding, dict):
                field = binding.get("field", "")
                if field and field not in column_names:
                    warnings.append(f"Sheet {sid}: unknown field '{field}' in {key}")

    layout = data.get("layout", {})
    for item in layout.get("items", []):
        if item.get("sheetId") not in sheet_ids:
            warnings.append(f"Layout references unknown sheetId '{item.get('sheetId')}'")

    return warnings


# ── Legacy prompt (backwards compat during transition) ───────────

def build_generate_prompt(ctx: DataContext, calc_fields: list[CalculatedFieldInput]) -> str:
    dims = [c for c in ctx.columns if c.role == "dimension"]
    measures = [c for c in ctx.columns if c.role == "measure"]

    dim_lines = "\n".join(
        f"  - {c.display_name or c.name} ({c.type}, samples: {', '.join(c.sample_values[:3])})"
        for c in dims
    ) or "  (none)"

    meas_lines = "\n".join(
        f"  - {c.display_name or c.name} ({c.type}, samples: {', '.join(c.sample_values[:3])})"
        for c in measures
    ) or "  (none)"

    calc_lines = ""
    if calc_fields:
        calc_lines = "\n\n**Calculated Fields:**\n" + "\n".join(
            f"  - {cf.name} = {cf.formula}" for cf in calc_fields
        )

    return f"""You are a dashboard generation engine for DashShip. Generate a complete dashboard specification as JSON.

## Data Profile

**Source:** {ctx.source_name}
**Rows:** {ctx.row_count:,}

**Dimensions ({len(dims)}):**
{dim_lines}

**Measures ({len(measures)}):**
{meas_lines}{calc_lines}

## Output Format

Return ONLY valid JSON with this exact structure — no markdown, no explanation:

{{
  "name": "Dashboard Title",
  "sheets": [
    {{
      "id": "sheet-1",
      "name": "Chart Title",
      "markType": "bar" | "line" | "area" | "scatter" | "pie" | "text" | "table",
      "encoding": {{
        "columns": {{ "field": "FieldName", "type": "dimension" | "measure", "aggregation": "sum" | "avg" | "count" | "min" | "max" | "none" }},
        "rows": {{ "field": "FieldName", "type": "dimension" | "measure", "aggregation": "sum" | "avg" | "count" | "min" | "max" | "none" }},
        "color": {{ "field": "FieldName", "type": "dimension" }} | null,
        "size": null,
        "label": null,
        "tooltip": [],
        "detail": []
      }},
      "config": {{
        "orientation": "vertical" | "horizontal",
        "stacked": false,
        "showLegend": false,
        "showLabels": false,
        "smooth": false,
        "sort": {{ "field": "FieldName", "order": "asc" | "desc" }} | null,
        "limit": null
      }},
      "filters": []
    }}
  ],
  "layout": {{
    "columns": 12,
    "rowHeight": 60,
    "items": [
      {{ "sheetId": "sheet-1", "x": 0, "y": 0, "w": 6, "h": 5 }}
    ]
  }}
}}

## Rules

1. Use ONLY field names that exist in the data profile above (or calculated fields).
2. For markType "text" (KPI cards), put the measure in "rows" encoding with an aggregation.
3. For bar/line/area charts, put the dimension in "columns" and the measure in "rows".
4. For pie charts, put the dimension in "columns" (category) and the measure in "rows" (value).
5. For scatter plots, put one measure in "columns" (x-axis) and another in "rows" (y-axis).
6. For tables, list dimension in "columns" and measures in "tooltip" array.
7. Layout grid is 12 columns wide. Position items to avoid overlap.
8. KPI cards should be w:3-4, h:3. Charts should be w:6-12, h:5-6. Tables w:12, h:6.
9. Generate 4-8 sheets for a comprehensive dashboard.
10. Include 2-3 KPI text cards at the top row for key metrics.
11. Use "sort" and "limit" to keep charts focused (e.g., top 10 categories).
12. Each sheet.id must be unique (sheet-1, sheet-2, etc.).
13. Return ONLY the JSON object. No other text."""


# ── Endpoint ─────────────────────────────────────────────────────

@router.post("")
async def generate_dashboard(request: GenerateRequest):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    # Collect valid field names
    field_names = {c.name for c in request.data_context.columns}
    for c in request.data_context.columns:
        if c.display_name:
            field_names.add(c.display_name)
    for cf in request.calculated_fields:
        field_names.add(cf.name)

    # ── New path: plan_spec provided → validate and return ────────
    if request.plan_spec:
        warnings = validate_plan_spec(request.plan_spec, field_names)
        return {
            "plan_spec": request.plan_spec,
            "warnings": warnings,
        }

    # ── Legacy path: AI generation from conversation summary ─────
    if not request.conversation_summary:
        raise HTTPException(
            status_code=400,
            detail="Either plan_spec or conversation_summary is required",
        )

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    system = build_generate_prompt(request.data_context, request.calculated_fields)

    user_message = f"""Based on the following dashboard planning conversation, generate a complete dashboard:

{request.conversation_summary}

Generate the dashboard JSON now."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4096,
            system=system,
            messages=[{"role": "user", "content": user_message}],
        )

        raw_text = response.content[0].text.strip()

        # Strip markdown code fences if present
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            lines = lines[1:]  # remove opening fence
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            raw_text = "\n".join(lines)

        dashboard = json.loads(raw_text)

        warnings = validate_legacy_response(dashboard, field_names)

        # Ensure required fields
        if "name" not in dashboard:
            dashboard["name"] = "Generated Dashboard"

        if "layout" not in dashboard:
            dashboard["layout"] = {"columns": 12, "rowHeight": 60, "items": []}

        # Inject dataSourceId into each sheet
        for sheet in dashboard.get("sheets", []):
            sheet["dataSourceId"] = request.data_context.source_id
            sheet["projectId"] = ""
            if "filters" not in sheet:
                sheet["filters"] = []

        return {
            "dashboard": dashboard,
            "warnings": warnings,
        }

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Claude returned invalid JSON: {str(e)}"
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Claude API error: {str(e)}")
