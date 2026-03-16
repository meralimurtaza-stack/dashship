import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic

from app.config import settings

router = APIRouter(prefix="/api/chat", tags=["chat"])


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


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    data_context: DataContext | None = None
    is_first_message: bool = False
    plan_spec: dict | None = None


# ── Captain System Prompt ────────────────────────────────────────

CAPTAIN_SYSTEM_PROMPT = """You are Captain, a dashboard planning consultant for DashShip.
The user has uploaded data and wants to build a dashboard. Your job is to understand their
business problem, define the logic, and build a structured dashboard plan through conversation.

## CRITICAL — Field Name Accuracy

You MUST use EXACT field names from the data profile below. Do not paraphrase, rename, or guess.
- If the data profile says "Revenue", use "Revenue" — NOT "Sales", "Total Revenue", or "Revenue Amount".
- If the data profile says "Date", use "Date" — NOT "Order_Date", "Order Date", or "date".
- Before emitting ANY plan_delta, verify every field name you reference exists verbatim in the data profile.
- If you are unsure whether a field exists, check the data profile again. Never assume a field name.
- Misspelled or invented field names break the dashboard. This is the single most important rule.

## How you work

1. Listen to what the user wants to achieve — the business question, not the chart type
2. Propose business rules, calculated fields, and chart layouts based on their data
3. For every concrete suggestion you make, emit a <plan_delta> block (see format below)
4. The user sees your natural language. The system reads your plan_delta blocks.
5. Add suggestions to the plan immediately — the user corrects what they disagree with

## Rules

- NEVER invent, paraphrase, or rename field names. Copy them character-for-character from the data profile.
- Before referencing a field, verify it exists VERBATIM in the data profile or in your proposed calculated fields.
- If a calculation requires a LOD/FIXED-style expression, flag it clearly and explain the grain.
- Keep responses concise — 2-4 sentences of explanation per suggestion.
- Multiple choice options are for genuinely ambiguous decisions ONLY, not the default.
- When you have enough context, propose a complete dashboard layout unprompted.
- Available chart types: bar, line, area, scatter, pie, kpi, table
- Available aggregations: sum, avg, count, count_distinct, min, max, none

## Plan delta format

After your natural language response, include one or more plan_delta blocks:

<plan_delta>
{"action": "add_sheet", "sheet": {"id": "unique-id", "intent": "What this shows", "chartType": "bar", "x": {"field": "ExactFieldName", "type": "dimension"}, "y": {"field": "ExactFieldName", "type": "measure", "agg": "sum"}}}
</plan_delta>

<plan_delta>
{"action": "add_calculated_field", "field": {"name": "Profit_Margin", "formula": "Profit / Revenue * 100", "type": "measure", "dependsOn": ["Profit", "Revenue"]}}
</plan_delta>

<plan_delta>
{"action": "set_plan_meta", "meta": {"title": "Dashboard Title", "description": "What it does"}}
</plan_delta>

<plan_delta>
{"action": "add_business_rule", "rule": {"name": "Alert thresholds", "rules": [{"status": "on_track", "condition": "ratio < 1.5", "action": "none"}]}}
</plan_delta>

## Inline insights

When answering data questions during planning, you can embed compact visualizations
in your response using insight tags:

<insight type="kpi" data='[{"label":"Total Revenue","value":"$663K","delta":"+18%","deltaDir":"up"},{"label":"Orders","value":"892","delta":"+5%","deltaDir":"up"}]' />

<insight type="bar" data='[{"label":"North","value":241000},{"label":"South","value":109000}]' title="Revenue by region" />

Use these when the user asks a data question and a visual would help them understand
the answer. The insight is rendered inline in the chat as a compact card.

Only use insights when you have enough context from the data profile to provide
realistic example values. If the data profile doesn't contain enough information
to populate the insight, describe the chart in text instead.

## Current plan

{current_plan_json}

## Data profile

{data_profile}
"""

PROJECT_NAME_INSTRUCTION = """

When responding to the user's FIRST message, include a suggested project name wrapped in: <project-name>Customer Insights</project-name>
The name should be 2-4 words that describe the dashboard's purpose.
Do not explain the tag — it will be parsed and removed before display."""

NO_DATA_INSTRUCTION = """

No data has been uploaded yet. When responding to the user's first message, acknowledge what they want to build. Then ask whether they'd like to use sample data (to see a dashboard in 60 seconds) or upload their own CSV/Excel file. Keep your response to 2-3 sentences. Do NOT ask multiple clarifying questions — just the data question."""

TEMPLATE_PROMPT_SECTION = """
## Dashboard templates

You have access to proven dashboard templates. Based on the data profile and user intent,
pick the BEST template and map the user's actual fields to it. Do NOT invent layouts from scratch.

Available templates:
1. **Sales performance** — for revenue/sales data with dates, amounts, and categories
   Layout: 4 KPIs + trend line + category bar chart + top items table + segment donut

2. **Customer analytics** — for customer behavior, retention, and value analysis
   Layout: 4 KPIs + customer trend + segment donut + top customers table + segment bar chart

3. **Operations overview** — for operational metrics, shipping, status tracking
   Layout: 4 KPIs + volume trend + status donut + category performance bar chart

4. **General KPI tracker** — fallback for any data with measures and dimensions
   Layout: 3 KPIs + category bar chart + distribution donut

RULES FOR TEMPLATES:
- Pick the template that best matches the user's intent and data shape
- Map EXACT field names from the data profile to template slots
- Maximum 4-6 charts total — templates define the layout, you fill in the fields
- Propose the mapped template to the user in your first substantive response
- The user can then adjust, add, or remove charts
- NEVER generate more than 6 sheets in a single response
- Every field you reference MUST exist in the data profile
"""


# ── System Prompt Builder ────────────────────────────────────────

def build_data_profile(ctx: DataContext) -> str:
    dims = [c for c in ctx.columns if c.role == "dimension"]
    measures = [c for c in ctx.columns if c.role == "measure"]

    dim_lines = []
    for c in dims:
        samples = ", ".join(c.sample_values[:4]) if c.sample_values else ""
        label = f"  - **{c.name}** ({c.type})"
        if c.display_name and c.display_name != c.name:
            label += f" [display: {c.display_name}]"
        if samples:
            label += f" — e.g. {samples}"
        dim_lines.append(label)

    meas_lines = []
    for c in measures:
        samples = ", ".join(c.sample_values[:3]) if c.sample_values else ""
        label = f"  - **{c.name}** ({c.type})"
        if c.display_name and c.display_name != c.name:
            label += f" [display: {c.display_name}]"
        if samples:
            label += f" — e.g. {samples}"
        meas_lines.append(label)

    return f"""**Source:** {ctx.source_name}
**Rows:** {ctx.row_count:,}

Use the **bolded names** exactly as written in plan_delta field references.

**Dimensions ({len(dims)}):**
{chr(10).join(dim_lines) if dim_lines else "  (none)"}

**Measures ({len(measures)}):**
{chr(10).join(meas_lines) if meas_lines else "  (none)"}"""


def build_system_prompt(
    ctx: DataContext | None,
    is_first_message: bool = False,
    plan_spec: dict | None = None,
    user_message: str = "",
) -> str:
    if ctx is None:
        prompt = CAPTAIN_SYSTEM_PROMPT.replace(
            "{current_plan_json}", "No plan yet — start building one."
        ).replace("{data_profile}", "No data uploaded yet.")
        prompt += NO_DATA_INSTRUCTION
        if is_first_message:
            prompt += PROJECT_NAME_INSTRUCTION
        return prompt

    data_profile = build_data_profile(ctx)

    if plan_spec:
        current_plan = json.dumps(plan_spec, indent=2)
    else:
        current_plan = "No plan yet — start building one."

    prompt = CAPTAIN_SYSTEM_PROMPT.replace(
        "{current_plan_json}", current_plan
    ).replace("{data_profile}", data_profile)

    # Always include template awareness
    prompt += TEMPLATE_PROMPT_SECTION

    # On first message with data, match a template and inject field mapping
    if is_first_message:
        prompt += PROJECT_NAME_INSTRUCTION
        try:
            from app.templates.dashboard_templates import match_template, map_fields_to_template, TEMPLATES

            profile = {
                "fields": [
                    {
                        "name": c.name,
                        "type": c.role,
                        "subtype": "date" if "date" in c.type.lower() else None,
                        "cardinality": len(set(c.sample_values)) if c.sample_values else 10,
                    }
                    for c in ctx.columns
                ]
            }
            template_key = match_template(profile, user_message)
            field_mapping = map_fields_to_template(template_key, profile)
            template = TEMPLATES[template_key]

            prompt += f"""

## Recommended template: {template['name']}
{template['description']}

Field mapping (use these EXACT field names):
{json.dumps(field_mapping, indent=2)}

Propose this template to the user with the mapped fields.
Generate the plan_delta blocks to create the dashboard plan.
"""
        except Exception:
            pass  # Template matching is best-effort; Captain can still work without it

    return prompt


# ── Streaming Endpoint ──────────────────────────────────────────

@router.post("")
async def chat(request: ChatRequest):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    # Extract last user message for template matching
    last_user_msg = ""
    for m in reversed(request.messages):
        if m.role == "user":
            last_user_msg = m.content
            break

    system = build_system_prompt(
        request.data_context,
        request.is_first_message,
        request.plan_spec,
        last_user_msg,
    )

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    def generate():
        try:
            with client.messages.stream(
                model="claude-sonnet-4-5-20250929",
                max_tokens=2048,
                system=system,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    yield text
        except anthropic.APIError as e:
            yield f"\n\n[Error: {str(e)}]"

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
