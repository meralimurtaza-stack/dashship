import re
import json
import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/generate", tags=["generate"])


# ── Models ───────────────────────────────────────────────────────

class ColumnStats(BaseModel):
    min: float | None = None
    max: float | None = None
    mean: float | None = None
    median: float | None = None
    unique_count: int | None = None
    null_count: int | None = None
    top_values: list[str] = []  # most frequent values for dimensions
    earliest: str | None = None  # for date columns
    latest: str | None = None    # for date columns
    granularity: str | None = None  # for date columns


class ColumnContext(BaseModel):
    name: str
    display_name: str | None = None
    type: str
    role: str
    sample_values: list[str] = []
    stats: ColumnStats | None = None


class DataContext(BaseModel):
    source_name: str
    source_id: str
    row_count: int
    columns: list[ColumnContext]
    sample_rows: list[dict] = []  # 5-10 complete sample rows


class CalculatedFieldInput(BaseModel):
    name: str
    formula: str


class GenerateRequest(BaseModel):
    data_context: DataContext
    conversation_summary: str = ""
    calculated_fields: list[CalculatedFieldInput] = []
    plan_delta: dict | None = None  # Structured plan from Captain


# ── System Prompt ────────────────────────────────────────────────

def _field_name(c: ColumnContext) -> str:
    """Return display_name if set, otherwise raw name. This is what the generated JSX uses."""
    return c.display_name if c.display_name else c.name


def build_sample_row(ctx: DataContext) -> str:
    """Build a JSON-like sample row from column sample values."""
    parts = []
    for c in ctx.columns:
        name = _field_name(c)
        val = c.sample_values[0] if c.sample_values else "null"
        if c.type == "number":
            parts.append(f'  "{name}": {val}')
        else:
            parts.append(f'  "{name}": "{val}"')
    return "{\n" + ",\n".join(parts) + "\n}"


def build_system_prompt(ctx: DataContext, calculated_fields: list[CalculatedFieldInput] | None = None) -> str:
    dims = [c for c in ctx.columns if c.role == "dimension"]
    measures = [c for c in ctx.columns if c.role == "measure"]

    field_list = []
    for c in ctx.columns:
        name = _field_name(c)
        samples = ", ".join(c.sample_values[:8]) if c.sample_values else "—"
        line = f"  {name} ({c.type}, {c.role}) — e.g. {samples}"
        if c.stats:
            s = c.stats
            if c.type == "number" and s.min is not None:
                line += f"\n    → range: {s.min} to {s.max}, mean: {s.mean}, median: {s.median}"
                if s.null_count:
                    line += f", nulls: {s.null_count}"
            elif c.type == "date" and s.earliest:
                line += f"\n    → range: {s.earliest} to {s.latest}, granularity: {s.granularity}"
            elif c.role == "dimension" and s.top_values:
                line += f"\n    → {s.unique_count} unique values. Top: {', '.join(s.top_values[:12])}"
                if s.null_count:
                    line += f", nulls: {s.null_count}"
        field_list.append(line)

    field_block = "\n".join(field_list)

    sample_rows_block = ""
    if ctx.sample_rows:
        rows_to_show = ctx.sample_rows[:8]
        sample_rows_block = f"""

SAMPLE DATA ({len(rows_to_show)} of {ctx.row_count:,} rows — use these to understand value patterns, NOT as the full dataset):
{json.dumps(rows_to_show, indent=2, default=str)}
"""

    calc_block = ""
    if calculated_fields:
        calc_lines = [f"  {cf.name}: {cf.formula}" for cf in calculated_fields]
        calc_block = f"""

APPROVED CALCULATED FIELDS — compute these inline in your component:
{chr(10).join(calc_lines)}
For each, derive the value from raw row fields (e.g., row["Profit"] / row["Sales"] * 100).
"""

    return f"""You are a senior data visualisation designer at a top-tier consultancy. You build dashboards that get screenshotted into board packs and VP presentations. Your work is known for being clean, confident, and data-dense without feeling cluttered.

You receive a structured plan telling you WHAT to build, and data stats telling you the data shape. Your job is to make every design decision — layout, colour, chart type, typography, spacing — with the same care a principal designer would.

## Data profile
Source: {ctx.source_name} ({ctx.row_count:,} rows)
Dimensions ({len(dims)}): {', '.join(_field_name(c) for c in dims)}
Measures ({len(measures)}): {', '.join(_field_name(c) for c in measures)}

Fields (use EXACT names with bracket notation — e.g. row["Field Name"]):
{field_block}

Sample row:
{build_sample_row(ctx)}
{sample_rows_block}
{calc_block}

## Technical constraints (non-negotiable)
- Single default function component named `Dashboard` accepting {{ data }} props
- `data` is an array of row objects with the exact field names above
- Use React.useState/useMemo/useCallback from global `React` object
- Use Recharts from global `Recharts` object (destructure at top)
- Inline styles only (no CSS classes, no Tailwind) — runs in iframe
- Bracket notation for field access — field names may contain spaces
- Guard all numeric values: Number(val) || 0, division by zero checks, isFinite() checks
- Convert Sets to arrays before .sort()/.map()/.filter()/.reduce()
- Include a fmt(n, type) helper for currency/percent/number formatting with K/M suffixes
- The fmt helper MUST handle values that may already contain currency symbols — strip any existing $, £, € before formatting, then re-add the prefix. This prevents "$$1.5M" double-symbol bugs.
- fontVariantNumeric: "tabular-nums" on all numeric displays

## ─── DESIGN INTELLIGENCE ──────────────────────────────────────

### Think before you build
Before writing any code, reason about:
1. **What domain is this data from?** (finance, healthcare, HR, marketing, operations, etc.) Let the domain inform your colour temperature, terminology, and visual tone. A hospital patient-flow dashboard should feel calmer and more clinical than a sales pipeline dashboard.
2. **What is the narrative?** Every good dashboard tells a story: here's the headline number, here's the context, here's the trend, here's where to dig in. Structure your layout to guide the eye through that narrative: KPIs → trends → breakdowns → detail.
3. **What is the data shape?** The number of dimensions, the cardinality of categories, the range of measures, the time span — all of these should drive your chart choices, not a fixed rule.

### Default design system
Unless the plan specifies custom branding/colours, use these defaults. They are a tested, cohesive system:
- **Page background:** #F7F5F2 (warm off-white). Cards: #FFFFFF
- **Primary colour:** #1B2A4A (ink navy) — used for text, chart fills, primary UI elements
- **Supporting colours:** #8B7BA8 (dusty purple), #8C6E5D (copper), #5C7A99 (cool steel) — for multi-series only
- **Positive indicator:** #2A9D8F (teal) — KPI variance text only, NEVER chart fills
- **Negative indicator:** #C0392B (muted red) — KPI variance text only, NEVER chart fills
- **Muted text/labels:** #8A8A86
- **Borders/grid:** #E8E8E6
- **Card style:** background #FFFFFF, border 1px solid #E8E8E6, borderRadius 12px, padding 20px, NO box-shadow

**If the plan specifies custom branding** (client colours, fonts), use those instead as primary/supporting and adapt the system accordingly.

### Colour application rules (CRITICAL — this makes or breaks the dashboard)
- **Chart fills MUST use rgba() at 60-70% opacity** — never raw hex. This creates the muted, sophisticated look.
  - Primary fill: rgba(27, 42, 74, 0.65)
  - Secondary fill: rgba(139, 123, 168, 0.6)
  - Tertiary fill: rgba(140, 110, 93, 0.6)
  - Quaternary fill: rgba(92, 122, 153, 0.6)
- **Single-series charts** (one bar set, one line, one area): always use PRIMARY fill only. One colour.
- **Multi-series charts** (multiple lines, grouped/stacked bars): use primary → secondary → tertiary → quaternary, in that order. Maximum 4 series with colour. If more, use opacity variations of primary.
- **Horizontal bar charts showing categories: ALL bars the SAME colour** (primary fill). Colour encodes series, not categories — the label already differentiates them.
- **Donut/pie slices:** use the primary at different opacities (85%, 65%, 45%, 30%) to stay tonal
- **Funnel bars:** all the same primary fill colour. The width encodes the stage, not the colour.
- **Semantic exception only:** if categories have inherent positive/negative meaning ("Won" vs "Lost", "Admitted" vs "Discharged"), you may use teal-family for positive and red-family for negative — but MUTED (rgba at 50-60%), never the raw indicator hex.

### Typography hierarchy
Use system-ui/-apple-system/sans-serif throughout. Create hierarchy through size and weight, not font changes:
- **Dashboard header area:** title (24px bold, primary colour) + subtitle (14px, muted colour) on the left. On the right: a "LIVE" pill badge (small, green background, white text, borderRadius 12px, padding "2px 10px", fontSize 11, textTransform uppercase) and "Updated 2 hours ago" text (12px, muted). Use flexbox with justifyContent space-between.
- Section headers: small (11px), uppercase, wide letter-spacing (0.1em), muted colour, fontWeight 600 — they organise without competing
- KPI labels: small (10px), uppercase, letter-spacing 0.08em, muted — subordinate to the number
- KPI values: large (28px desktop, 22px mobile), bold — the star of the card
- Chart titles: small (11px), uppercase, letter-spacing 0.08em, muted — like section headers
- Axis labels & data: small (11px), regular weight, muted
- The pattern: big things are bold and dark, small things are light and muted. Nothing in between.

### KPI cards
KPI cards are the first thing a VP reads. Get them right:
- Clear hierarchy inside each card: label (tiny, muted, uppercase) → value (large, bold) → context line (target, variance, trend)
- If there's a target, show it: "Target: $5M" with a variance indicator
- Variance formatting: if the KPI IS a rate/percentage, show delta in percentage points (pp). If it's an absolute number, show delta as relative %. Use ↑/↓/→ arrows with semantic colour.
- Layout: row of equal-width cards. 3-5 per row desktop, 2 per row mobile. Use CSS grid with equal columns.
- Cards should have subtle borders (1px solid, light grey), rounded corners, NO drop shadows. Flat and clean.

### Chart selection (read the data, then decide)
- **Time series** → Bar chart for monthly/quarterly (readers expect discrete buckets), line chart for daily/weekly (too many bars). Add area gradient under lines.
- **Few categories (≤6) with one measure** → Horizontal bar chart, sorted by value descending. Thin bars (12-16px barSize), ALL the same primary fill colour, rounded right-end (radius [0, 4, 4, 0]). Category label on the left (YAxis type="category"), formatted value on the right side after the bar end. Clean and minimal — no grid lines needed on horizontal bars.
- **Many categories (>6)** → Vertical bar chart with top N + "Other", or a table
- **Part-of-whole (2-5 items)** → Donut chart. Never pie. Always donut with a centre metric.
- **Funnel / sequential stages** → Custom HTML bars (NOT Recharts). Build as a series of rows, each containing: label (left), a bar with a VISIBLE GREY TRACK behind it (#EEECE8), the filled portion in primary colour at 65% opacity, and percentage values on the right. Show TWO percentage columns: "% of previous stage" and "% of total" (bold). Each row ~36px height. The bar width is proportional to the value relative to the first/largest stage. Rounded right-end on the filled bar (borderRadius "0 4px 4px 0").
- **Two measures to compare** → Grouped or overlaid bars. Or a dual-axis line if time-based.
- **Distribution** → Histogram or box-style summary
- **Geo breakdown** → Horizontal bars by region (maps are overrated in dashboards; bars are more readable)

### Recharts polish
When using Recharts, these details separate good from great:
- CartesianGrid: horizontal lines only, dashed (strokeDasharray="3 3"), very light colour
- Axes: hide axisLine and tickLine (stroke="none"). Let the grid do the work.
- XAxis padding: {{ left: 10, right: 10 }} so bars don't touch edges
- YAxis: format with K/M suffixes via tickFormatter
- Bar radius: [4, 4, 0, 0] for vertical (top-rounded), [0, 4, 4, 0] for horizontal (right-rounded)
- Bar maxBarSize: 40-50 so bars don't become comically wide on few data points
- Value labels: above bars or at end of horizontal bars, small font, bold, formatted with fmt()
- Tooltip: white background, subtle border, rounded corners, small shadow, compact padding. Never the default grey Recharts tooltip.
- Line charts: type="monotone", strokeWidth 2, dots only on hover (activeDot), area gradient underneath with very low opacity (0.1-0.15)
- Donut: innerRadius ~55%, outerRadius ~80%, centre label with the total/primary metric

### Filters (IMPORTANT — get the UX right)
If the plan includes filters:

**Implementation pattern — use this exact approach:**
- Each filter is a native `<select>` element styled to look like a pill button
- Wrap each `<select>` in a `<div>` with these styles: display inline-flex, alignItems center, background #FFFFFF, border 1px solid #E2E0DC, borderRadius 20px, padding "0", overflow hidden
- Style the `<select>` itself: border none, outline none, background transparent, padding "8px 32px 8px 16px", fontSize 13, color #1B2A4A (or your primary dark), fontFamily inherit, cursor pointer, WebkitAppearance "none", MozAppearance "none", appearance "none"
- Add a custom chevron: use a `<span>` with "▾" positioned absolutely (right 12px) or use backgroundImage with an inline SVG data URI for the dropdown arrow
- NEVER use `<select multiple>` or set the `size` attribute — this causes the dropdown to render as an open scrollable list, which looks broken
- NEVER render filter options as visible lists/checkboxes — always a closed dropdown that opens on click
- First option should be "All" for each filter (e.g., "All Regions", "All Channels")

**Date filters specifically:**
- If a date/time dimension exists in the data, add a time range filter
- Render as a `<select>` with preset options: "All Time", "Last 7 Days", "Last 30 Days", "Last 90 Days", "Last 12 Months", "YTD"
- Compute the filter by comparing each row's date to the current date minus the selected range
- Style identically to the other pill filters — same border-radius, padding, appearance

**Filter bar layout:**
- All filters in a single row, gap 8px, flexWrap wrap, marginBottom 20px
- Place below the dashboard title/subtitle, above the KPI cards
- On mobile: allow wrapping to second row, or horizontal scroll with overflowX auto

### Layout and spacing
- Group related charts under section headers (small uppercase text, wide tracking)
- Use CSS grid for the main layout. Charts that relate to each other go side-by-side on desktop.
- Generous whitespace between sections (28-36px). Tighter gaps between cards in a group (10-14px).
- Inner card padding: ~20px desktop, ~14px mobile
- Everything should breathe. If it feels cramped, add more space.

### Data tables (if needed)
- Alternating row colours (white / very light grey)
- Header: small uppercase, muted, bottom border
- Cells: compact padding, right-align numbers, left-align text
- Horizontal scroll wrapper on mobile

### Responsive design
Use a `useWindowWidth()` hook (window.innerWidth with resize listener):
- Desktop (>768px): multi-column grid
- Mobile (≤768px): single column, everything stacks
- KPI values: ~28px desktop → ~22px mobile
- Card padding: 20px → 14px
- Filters: inline row → horizontal scroll
- Tables: overflow-x auto
- Keep ALL data and interactivity — just reflow

### The quality test
Before you finish, mentally check: "If a marketing director screenshotted this into a keynote for the CEO, would it look intentional and polished — or would it look like a developer's first draft?" Every pixel should pass that test.

## ─── PLAN EXECUTION ───────────────────────────────────────────

- Follow the plan_delta exactly for WHAT to build (which KPIs, charts, filters, sections)
- Make your own intelligent decisions for HOW it looks (colours, spacing, chart subtypes, label handling)
- If plan specifies targets/comparisons on KPIs, show target + variance with the rules above
- If plan specifies multiple views/tabs, add clean tab navigation
- If plan specifies preferences (colours, font, branding), honour them — they override your choices
- If plan specifies dataTransforms (exclusions, renames), apply them
- If plan specifies filter defaults, pre-filter data accordingly
- Add granularity toggle buttons (Daily/Weekly/Monthly) on time-series charts when the date range supports it
- Add a small "ⓘ" icon (low opacity) on each chart card that shows field mapping on hover

## Output
Wrap in ```jsx fences. No commentary before or after.

```jsx
function Dashboard({{ data }}) {{
  // your component
}}
```"""


# ── JSX Extraction ───────────────────────────────────────────────

def extract_jsx(text: str) -> str:
    """Extract JSX code from Claude's response. Handles code fences."""
    text = text.strip()

    pattern = r'```(?:jsx|tsx|javascript|js)\s*\n([\s\S]*?)```'
    match = re.search(pattern, text)
    if match:
        return match.group(1).strip()

    pattern2 = r'```\s*\n([\s\S]*?)```'
    match2 = re.search(pattern2, text)
    if match2:
        code = match2.group(1).strip()
        if 'function Dashboard' in code or 'const Dashboard' in code:
            return code

    if 'function Dashboard' in text or 'const Dashboard' in text:
        lines = text.split('\n')
        start = 0
        for i, line in enumerate(lines):
            if 'function Dashboard' in line or 'const Dashboard' in line or 'const {' in line:
                start = i
                break
        return '\n'.join(lines[start:]).strip()

    raise ValueError("Could not extract JSX component from response")


def validate_jsx(code: str) -> list[str]:
    """Validate generated JSX code for common issues."""
    warnings: list[str] = []

    if 'Dashboard' not in code:
        warnings.append("Component 'Dashboard' not found in generated code")

    if 'data' not in code:
        warnings.append("Component does not reference 'data' prop")

    open_parens = code.count('(') - code.count(')')
    open_braces = code.count('{') - code.count('}')
    if open_parens > 2:
        warnings.append(f"Possibly unclosed parentheses (imbalance: {open_parens})")
    if open_braces > 2:
        warnings.append(f"Possibly unclosed braces (imbalance: {open_braces})")

    if '.percentage' in code:
        warnings.append("Uses .percentage instead of .percent — Recharts Pie bug")

    if re.search(r'row\.\w+\s+\w+', code):
        warnings.append("Possible dot notation on field with spaces — use bracket notation")

    if re.search(r'new Set\([^)]*\)\.(sort|map|filter|reduce)', code):
        warnings.append("Calling array method on Set — convert to array first")

    return warnings


def generate_with_retry(client, system: str, user_message: str, max_retries: int = 1) -> tuple[str, list[str]]:
    """Generate JSX with optional retry on validation failure."""
    for attempt in range(max_retries + 1):
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=16000,
            system=system,
            messages=[{"role": "user", "content": user_message}],
        )

        raw_text = response.content[0].text.strip()
        logger.info(f"[generate] Attempt {attempt + 1}: response length {len(raw_text)} chars")

        try:
            jsx_code = extract_jsx(raw_text)
        except ValueError:
            if attempt < max_retries:
                logger.warning(f"[generate] Attempt {attempt + 1}: JSX extraction failed, retrying...")
                continue
            raise

        warnings = validate_jsx(jsx_code)
        critical = [w for w in warnings if "not found" in w or "unclosed" in w]

        if critical and attempt < max_retries:
            logger.warning(f"[generate] Attempt {attempt + 1}: critical warnings {critical}, retrying...")
            continue

        return jsx_code, warnings

    raise ValueError("Generation failed after all retries")


# ── Endpoint ─────────────────────────────────────────────────────

@router.post("")
async def generate_dashboard(request: GenerateRequest):
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    if not request.conversation_summary and not request.plan_delta:
        raise HTTPException(
            status_code=400,
            detail="Either conversation_summary or plan_delta is required",
        )

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    system = build_system_prompt(
        request.data_context,
        request.calculated_fields or None,
    )

    if request.plan_delta:
        plan_json = json.dumps(request.plan_delta, indent=2)
        user_message = f"""Here is the approved dashboard plan:

{plan_json}

And here is the planning conversation for additional context:

{request.conversation_summary}

Generate the React dashboard component now. Follow the plan exactly. Wrap it in ```jsx fences."""
    else:
        user_message = f"""Based on this dashboard planning conversation, generate the best possible dashboard component:

{request.conversation_summary}

Generate the React dashboard component now. Wrap it in ```jsx fences."""

    try:
        jsx_code, warnings = generate_with_retry(client, system, user_message)

        if warnings:
            logger.warning(f"[generate] Validation warnings: {warnings}")

        return {
            "jsx_code": jsx_code,
            "warnings": warnings,
        }

    except ValueError as e:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to extract JSX: {str(e)}",
        )
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {str(e)}")


# ── Streaming Endpoint ──────────────────────────────────────────

@router.post("/stream")
async def generate_dashboard_stream(request: GenerateRequest):
    """Stream generation with progress markers for real-time UI feedback."""
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    if not request.conversation_summary and not request.plan_delta:
        raise HTTPException(
            status_code=400,
            detail="Either conversation_summary or plan_delta is required",
        )

    system = build_system_prompt(
        request.data_context,
        request.calculated_fields or None,
    )

    if request.plan_delta:
        plan_json = json.dumps(request.plan_delta, indent=2)
        user_message = f"""Here is the approved dashboard plan:

{plan_json}

And here is the planning conversation for additional context:

{request.conversation_summary}

Generate the React dashboard component now. Follow the plan exactly. Wrap it in ```jsx fences."""
    else:
        user_message = f"""Based on this dashboard planning conversation, generate the best possible dashboard component:

{request.conversation_summary}

Generate the React dashboard component now. Wrap it in ```jsx fences."""

    def stream_generate():
        try:
            accumulated = ""
            milestones_sent = set()

            milestone_markers = [
                ("fmt(", "Building number formatting..."),
                ("useState", "Setting up interactivity..."),
                ("KPI", "Building KPI cards..."),
                ("BarChart", "Building bar charts..."),
                ("LineChart", "Building trend charts..."),
                ("PieChart", "Building pie charts..."),
                ("ScatterChart", "Building scatter plots..."),
                ("filter", "Building filters..."),
                ("return (", "Assembling layout..."),
            ]

            with anthropic.Anthropic(api_key=settings.anthropic_api_key).messages.stream(
                model="claude-sonnet-4-5-20250929",
                max_tokens=16000,
                system=system,
                messages=[{"role": "user", "content": user_message}],
            ) as stream:
                for text in stream.text_stream:
                    accumulated += text

                    for marker, message in milestone_markers:
                        if marker in accumulated and marker not in milestones_sent:
                            milestones_sent.add(marker)
                            yield f"data: {json.dumps({'type': 'progress', 'message': message})}\n\n"

                    yield f"data: {json.dumps({'type': 'chunk', 'text': text})}\n\n"

            try:
                jsx_code = extract_jsx(accumulated)
                warnings = validate_jsx(jsx_code)
                yield f"data: {json.dumps({'type': 'complete', 'jsx_code': jsx_code, 'warnings': warnings})}\n\n"
            except ValueError as e:
                yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"

        except anthropic.APIError as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"

    return StreamingResponse(
        stream_generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Edit Endpoint ───────────────────────────────────────────────

class EditRequest(BaseModel):
    current_jsx: str
    edit_request: str
    conversation_history: list[dict] = []  # [{role, content}]
    data_context: DataContext | None = None


EDIT_SYSTEM_PROMPT = """You are a senior data visualisation designer editing an existing React dashboard component. The user wants a specific change.

RULES:
- Return the FULL updated component with ONLY the requested changes applied
- Do NOT modify anything the user didn't ask to change
- Keep all existing styles, data processing, formatting, responsive behavior, and layout intact
- Use the same technical constraints: React/Recharts globals, inline styles, bracket notation
- Guard all numeric values against NaN
- Maintain mobile responsiveness (single column on <=768px, stacked KPIs, full-width charts)
- Preserve the existing design quality — muted chart fills (rgba, not raw hex), rounded bar corners, clean typography hierarchy, generous whitespace, warm backgrounds
- Wrap in ```jsx fences. No commentary before or after.
"""


@router.post("/edit")
async def edit_dashboard(request: EditRequest):
    """Apply targeted edits to an existing dashboard component."""
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=500, detail="Anthropic API key not configured")

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    recent_history = ""
    if request.conversation_history:
        recent = request.conversation_history[-10:]
        recent_history = "\n\nRecent conversation:\n" + "\n".join(
            f"{'User' if m['role'] == 'user' else 'Captain'}: {m['content']}"
            for m in recent
        )

    user_message = f"""Here is the current dashboard component:

```jsx
{request.current_jsx}
```
{recent_history}

Apply this change: {request.edit_request}

Return the FULL updated component with only this change applied. Wrap in ```jsx fences."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=16000,
            system=EDIT_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        )

        raw_text = response.content[0].text.strip()
        logger.info(f"[edit] Claude response length: {len(raw_text)} chars")

        jsx_code = extract_jsx(raw_text)
        warnings = validate_jsx(jsx_code)

        return {
            "jsx_code": jsx_code,
            "warnings": warnings,
        }

    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract JSX: {str(e)}")
    except anthropic.APIError as e:
        raise HTTPException(status_code=502, detail=f"Anthropic API error: {str(e)}")
