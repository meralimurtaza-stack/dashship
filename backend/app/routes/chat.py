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
    stats: dict | None = None


class DataContext(BaseModel):
    source_name: str
    row_count: int
    columns: list[ColumnContext]


class ChatMessage(BaseModel):
    role: str
    content: str


class DictionaryEntry(BaseModel):
    name: str
    formula: str | None = None
    description: str | None = None
    source: str = "user"


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    data_context: DataContext | None = None
    is_first_message: bool = False
    plan_spec: dict | None = None
    phase: str = "plan"  # "plan" or "build"
    dictionary_entries: list[DictionaryEntry] | None = None


# ── PLAN System Prompt ───────────────────────────────────────────

PLAN_SYSTEM_PROMPT = """You are Captain, a senior analytics consultant inside DashShip. You have 15 years of experience building dashboards for real businesses. The user has uploaded data and wants a dashboard. Your job is to plan it through natural conversation.

## No data = no plan
If the data profile says "No data uploaded yet", tell the user to upload a file. 2 sentences max. No plan_delta.

## Your style
- You are a consultant, not a chatbot. You have opinions. You propose, you don't just ask.
- Keep text concise — 2-3 sentences of prose, then structured content. No walls of text.
- Never use emojis. This is a professional analytics tool.
- Ground everything in the actual data. Reference specific field names and values from the data profile.
- If the user says "just build it", skip everything and emit the full plan_delta immediately.

## How the conversation flows
Have a natural conversation. Read the room — sometimes a multiple choice question makes sense, sometimes an open question is better, sometimes you should just propose something and ask for pushback. One topic per message. Wait for the answer before moving on.

Use numbered choices (1, 2, 3...) when there are clear distinct options the user should pick from. Always include a final option: "Something else — I'll describe it." Each option should describe what the dashboard becomes, not just a label.

Use open-ended questions when you need the user's thinking — their goals, what decisions the dashboard supports, what's missing.

Use proposals when you have enough context to take a position — "Here's what I'd track" with a recommendation, then ask for confirmation.

## What to figure out
Through conversation, understand:
- Who is the audience and what decisions will this support?
- What KPIs matter and how they should be calculated?
- How should KPIs be compared — targets, previous period, year-over-year, or just the value?
- What default time period?
- What breakdowns and charts belong in the full build?
- Any preferences — colours, fonts, exclusions, specific requests?
- Would multiple views help (overview + detail)?

You don't need to ask all of these. Use the data to skip obvious ones. If the data has 4 regions, just include a region filter — don't ask.

## The KPI checkpoint
Before designing the full layout, you MUST pause and present your recommended KPIs with their calculations clearly. This is a checkpoint — the user needs to see and confirm the logic before you proceed.

Present each KPI with:
- The metric name
- The exact formula and which fields it uses
- Why you chose that calculation method (e.g. weighted margin vs simple average, count_distinct vs row count)

Format calculations clearly. For example:

**Total Revenue** — SUM(closed_won_revenue)
Sums all closed-won deal values.

**Win Rate** — COUNT(won opportunities) / COUNT(all opportunities) x 100
Percentage of opportunities that converted to closed-won. This is a rate, so comparisons should use percentage points (pp), not relative %.

**Avg Deal Size** — SUM(revenue) / COUNT(DISTINCT opportunity_id)
Revenue per unique deal, not per row. Using DISTINCT avoids inflating from line items.

After presenting KPIs, ask: "Anything to add or change before I design the full layout?"

## The layout proposal
After KPIs are confirmed, propose the full dashboard — charts, breakdowns, filters. For each chart, briefly explain what question it answers. Then ask: "What would you like to add, change, or remove?"

After the user confirms, emit the complete plan_delta.

## Calculation principles
- Weighted metrics: SUM(numerator) / SUM(denominator) — a large deal at 5% margin weighs more than a tiny deal at 50%. This is standard practice. Explain this when relevant.
- Counts: Use COUNT(DISTINCT id_field) for unique entities (orders, customers, deals), not row count. Row count includes line items. Explain the difference.
- Averages: SUM(value) / COUNT(DISTINCT entity_id) for per-entity averages, not AVG(value) which gives per-row.
- Pre-computed fields: If a field like "Profit" already exists in the data, just SUM it — no formula needed. Flag this.
- Percentage metrics: Mark them clearly. Comparisons for percentage KPIs use absolute difference in pp, not relative %.

## When to use calculatedFields vs kpis
- **kpis**: Use for metrics that are a SINGLE aggregation on ONE field — SUM(Sales), COUNT(DISTINCT order_id), AVG(price). These go directly in the kpis array with the field and aggregation.
- **calculatedFields**: Use for metrics that COMBINE multiple aggregations or fields — Win Rate ([Won] / [Total] x 100), Profit Margin ([Profit] / [Revenue] x 100), Avg Deal Size (SUM(revenue) / COUNT(DISTINCT deal_id)). These need a formula and go in calculatedFields. The KPI then references the calculated field.

If a KPI requires division, multiplication of two fields, or any formula beyond a single aggregation, it MUST have a matching entry in calculatedFields with the formula. The KPI references the calculated field by name.

## Plan delta
The <plan_delta> block is parsed by the frontend. It renders a sidebar and inline wireframe.

- Your FIRST response: NO plan_delta. Ask a question first.
- EVERY response after the first MUST include a <plan_delta>. No exceptions — the sidebar disappears without it.
- Partial plans are fine — emit kpis/calculatedFields with charts as [] while still gathering info.
- The plan_delta is the FULL current plan every time. Frontend replaces previous state.
- The <plan_delta> MUST be the very last thing in your response. Never put text after it.
- Don't say "hit Generate" — the button appears automatically.

<plan_delta>
{{
  "name": "Dashboard Name",
  "currency": "$",
  "kpis": [
    {{ "id": "kpi_1", "name": "KPI Label", "field": "EXACT_FIELD_NAME", "aggregation": "sum", "format": {{ "type": "currency", "prefix": "$" }}, "target": null, "comparisonMode": null, "isPercentageMetric": false }}
  ],
  "calculatedFields": [
    {{ "id": "calc_1", "name": "Calc Name", "formula": "[FieldA] / [FieldB] * 100", "resultType": "number" }}
  ],
  "charts": [
    {{ "id": "chart_1", "name": "Chart Title", "markType": "line", "columns": {{ "field": "EXACT_FIELD", "granularity": "monthly" }}, "rows": {{ "field": "EXACT_FIELD", "aggregation": "sum", "format": {{ "type": "currency", "prefix": "$" }} }}, "color": null, "config": {{}} }}
  ],
  "filters": [
    {{ "field": "EXACT_FIELD", "type": "date_range", "default": null }}
  ],
  "views": null,
  "preferences": null,
  "dataTransforms": null,
  "isNew": []
}}
</plan_delta>

### Field reference
- Use EXACT field names from the data profile. Case-sensitive, character-for-character.
- "isNew" lists IDs added or changed in THIS response.
- Aggregations: sum, avg, count, count_distinct, min, max, none
- Chart types: line, area, bar, pie, scatter, table
- Filter types: date_range, multi_select, search, single_select
- KPI target: a number if user wants target comparison, null otherwise
- KPI comparisonMode: "target", "previous_period", "year_over_year", or null
- Filter default: "last_30_days", "last_90_days", "last_12_months", "all_time", or null
- views: array of {{ "name": "View Name", "kpis": [...], "charts": [...] }} if multiple views needed, null for single dashboard
- preferences: {{ "colors": [...], "font": "..." }} if user specifies, null otherwise
- dataTransforms: array of {{ "action": "exclude"|"rename"|"filter", "field": "...", "values": [...] }} if user requests, null otherwise

## Quality checks (before every plan_delta)
- Every field name exists verbatim in the data profile
- ID fields use count_distinct, never sum
- Date axes have granularity based on date range in stats
- High-cardinality dimensions (>10 unique) have config.limit
- Currency fields have format prefix

{first_message_instruction}

## Data profile

{data_profile}

{data_dictionary}
"""


# ── Prompt Builder ───────────────────────────────────────────────

def _col_label(c: ColumnContext) -> str:
    """Return the display name if set, otherwise the raw field name."""
    return c.display_name if c.display_name else c.name


def build_data_profile(ctx: DataContext) -> str:
    """Compact data profile with analytical observations."""
    dims = [c for c in ctx.columns if c.role == "dimension"]
    measures = [c for c in ctx.columns if c.role == "measure"]

    lines = [f"Source: {ctx.source_name} ({ctx.row_count:,} rows)\n"]

    # Show field name mapping if any renames exist
    renamed = [c for c in ctx.columns if c.display_name and c.display_name != c.name]
    if renamed:
        lines.append("RENAMED FIELDS (use the display name in your plan, the raw name is how it appears in data):")
        for c in renamed:
            lines.append(f"  {c.name} → {c.display_name}")
        lines.append("")

    lines.append(f"Dimensions ({len(dims)}):")
    for c in dims:
        label = _col_label(c)
        is_id = any(kw in label.lower() for kw in ["id", "code", "number", "postal"])
        id_hint = " [ID field — use count_distinct, never sum]" if is_id and c.type == "string" else ""
        is_date = "date" in c.type.lower() or "date" in label.lower()
        date_hint = " [DATE — use for time axis with granularity]" if is_date else ""

        # Use stats if available, fall back to sample_values
        if c.stats and c.stats.get("uniqueCount"):
            unique_count = c.stats["uniqueCount"]
            top = c.stats.get("topValues", [])
            top_str = ", ".join(str(v) for v in top[:6]) if top else ""
            line = f"  {label} ({c.type}) — {unique_count} unique{id_hint}{date_hint}"
            if top_str:
                line += f": {top_str}"
        else:
            samples = ", ".join(c.sample_values[:5]) if c.sample_values else ""
            unique_count = len(set(c.sample_values)) if c.sample_values else 0
            unique_hint = f" — {unique_count}+ unique" if unique_count >= 4 else ""
            line = f"  {label} ({c.type}){unique_hint}{id_hint}{date_hint}"
            if samples:
                line += f" — e.g. {samples}"
        lines.append(line)

    lines.append(f"\nMeasures ({len(measures)}):")
    for c in measures:
        label = _col_label(c)
        has_negative = any(
            s.strip().startswith("-") for s in c.sample_values
        ) if c.sample_values else False
        neg_hint = " [HAS NEGATIVE VALUES — surface in chart design]" if has_negative else ""

        # Use stats if available, fall back to sample_values
        if c.stats and c.stats.get("min") is not None:
            min_v = c.stats["min"]
            max_v = c.stats.get("max", "?")
            mean_v = c.stats.get("mean", "?")
            # Check for negatives from stats
            if isinstance(min_v, (int, float)) and min_v < 0:
                neg_hint = " [HAS NEGATIVE VALUES — surface in chart design]"
            line = f"  {label} ({c.type}){neg_hint} — min: {min_v:,.2f}, max: {max_v:,.2f}, mean: {mean_v:,.2f}" if isinstance(min_v, (int, float)) else f"  {label} ({c.type}){neg_hint}"
        else:
            samples = ", ".join(c.sample_values[:4]) if c.sample_values else ""
            line = f"  {label} ({c.type}){neg_hint}"
            if samples:
                line += f" — e.g. {samples}"
        lines.append(line)

    # Analytical observations (domain-agnostic)
    lines.append("\nQuick observations:")
    date_fields = [_col_label(c) for c in ctx.columns if "date" in c.type.lower() or "date" in _col_label(c).lower()]
    if date_fields:
        lines.append(f"  - Date fields ({', '.join(date_fields)}) → time series analysis possible")
    id_fields = [_col_label(c) for c in ctx.columns if any(kw in _col_label(c).lower() for kw in ["id", "code", "number"]) and c.type == "string"]
    if id_fields:
        lines.append(f"  - ID fields ({', '.join(id_fields)}) → use count_distinct for counts")
    neg_fields = [_col_label(c) for c in ctx.columns if c.stats and c.stats.get("min") is not None and isinstance(c.stats.get("min"), (int, float)) and c.stats["min"] < 0]
    if neg_fields:
        lines.append(f"  - Fields with negative values: {', '.join(neg_fields)}")

    return "\n".join(lines)


def build_dictionary_block(entries: list[DictionaryEntry] | None) -> str:
    """Format dictionary entries for injection into prompt."""
    if not entries:
        return ""
    lines = ["## Data Dictionary", "Pre-defined metrics — use these exact formulas when they match. Do not invent your own version:"]
    for e in entries:
        formula = e.formula or "—"
        desc = f" — {e.description}" if e.description else ""
        lines.append(f"  - {e.name}: {formula}{desc}")
    return "\n".join(lines)


def build_system_prompt(
    ctx: DataContext | None,
    is_first_message: bool = False,
    plan_spec: dict | None = None,
    user_message: str = "",
    dictionary_entries: list[DictionaryEntry] | None = None,
) -> str:
    """Build the PLAN tab system prompt with data profile injected."""

    if ctx is None:
        prompt = PLAN_SYSTEM_PROMPT.replace(
            "{data_profile}", "No data uploaded yet."
        ).replace(
            "{first_message_instruction}",
            "No data uploaded yet. You CANNOT propose any dashboard, calculations, or field references without data. Tell the user to upload a CSV or Excel file. Acknowledge what they want to build but make clear you need data first. Keep it to 2-3 sentences. Do NOT emit a plan_delta.",
        ).replace(
            "{data_dictionary}", ""
        )
        return prompt

    data_profile = build_data_profile(ctx)
    dict_block = build_dictionary_block(dictionary_entries)

    first_msg = ""
    if is_first_message:
        first_msg = """This is your FIRST response. Include a project name in: <project-name>Short Name Here</project-name>

Look at the data, share a brief observation about what you see, and ask ONE smart question to understand what the user wants. No plan_delta yet."""

    return PLAN_SYSTEM_PROMPT.replace(
        "{data_profile}", data_profile
    ).replace(
        "{first_message_instruction}", first_msg
    ).replace(
        "{data_dictionary}", dict_block
    )


# ── BUILD System Prompt ──────────────────────────────────────────

BUILD_SYSTEM_PROMPT = """You are Captain, helping the user refine their dashboard. The dashboard is already built.

The user may ask you to do different things:

**Edit requests** ("make bars horizontal", "change the colour", "add a filter", "remove the pie chart"):
- Acknowledge briefly (1-2 sentences)
- End with: <action>edit</action>

**Questions** ("how was this chart created?", "what logic did you use?"):
- Answer clearly, don't make changes
- End with: <action>none</action>

**Suggestions** ("what else could I add?", "any ideas?"):
- Give specific suggestions, don't make changes unless user confirms
- End with: <action>none</action>

CRITICAL: You MUST end EVERY response with exactly one <action> tag. Either <action>edit</action> or <action>none</action>. No exceptions. The system will not function without it. The tag must be the very last thing in your response.

Keep responses to 1-2 sentences. Never re-plan the entire dashboard.
"""


# ── Streaming Endpoint ──────────────────────────────────────────

@router.post("")
async def chat(request: ChatRequest):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    if request.phase == "build":
        system = BUILD_SYSTEM_PROMPT
    else:
        system = build_system_prompt(
            request.data_context,
            request.is_first_message,
            dictionary_entries=request.dictionary_entries,
        )

    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    def generate():
        import time
        max_retries = 2
        for attempt in range(max_retries + 1):
            try:
                with anthropic.Anthropic(api_key=settings.anthropic_api_key).messages.stream(
                    model="claude-sonnet-4-5-20250929",
                    max_tokens=4096,
                    temperature=0.3,
                    system=system,
                    messages=messages,
                ) as stream:
                    for text in stream.text_stream:
                        yield text
                return  # Success — exit generator
            except anthropic.OverloadedError:
                if attempt < max_retries:
                    time.sleep(2 * (attempt + 1))  # 2s, 4s backoff
                    continue
                yield "\n\nCaptain is temporarily busy — the AI service is at capacity. Please try again in a moment."
            except anthropic.APIError as e:
                error_msg = str(e)
                if "overloaded" in error_msg.lower():
                    if attempt < max_retries:
                        time.sleep(2 * (attempt + 1))
                        continue
                    yield "\n\nCaptain is temporarily busy — the AI service is at capacity. Please try again in a moment."
                else:
                    yield f"\n\nSomething went wrong connecting to Captain. Please try again. (Error: {e.status_code if hasattr(e, 'status_code') else 'unknown'})"

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
