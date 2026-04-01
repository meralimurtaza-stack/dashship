# DashShip — Customer Journey & Build Specification v3.1

**Date:** March 2026
**Status:** Ready to implement — replaces Build Specification v2.0
**Key changes from v2.0:** No Tableau-style shelf editing. Conversational editing via Captain. Inline wireframes in planning. Claude-inspired UI. Continuous conversation from PLAN through BUILD. Mobile/desktop toggle. Inline data editing in PLAN sidebar. Republish model for published dashboards. Project-level data ownership (Option A).

---

## 1. Product summary

DashShip is an AI-powered dashboard builder. Users upload data, chat with Captain (the AI consultant), get a production-ready dashboard generated, refine it through conversation, and publish to secure hosted URLs with client branding.

**Core loop:** Upload → Review data → Plan dashboard → Generate → Edit via chat → Publish

---

## 2. Design system

### Visual identity

- **Fonts:** IBM Plex Sans (UI), IBM Plex Mono (field names, formulas, labels)
- **Background:** `#FAFAF8` warm off-white
- **Text:** `#0E0D0D` near-black
- **Accent:** `#2A9D8F` muted teal (used sparingly)
- **Border radius:** No sharp corners. Cards use 12px radius. Input bars use pill-shape (20px+). Buttons use 8-10px. KPI cards, chart cards, and dashboard containers all use generous rounding (8-12px).
- **Borders:** 0.5px solid, subtle. No heavy borders.
- **Captain icon:** Ship wheel SVG
- **DashShip logo:** Inline ship SVG with `currentColor`

### Dashboard rendering style (design benchmark)

The rendered dashboard on the BUILD tab sets the visual benchmark for the entire product:
- **KPI cards:** Light secondary background (`background-secondary`), 8px radius, metric label in small muted text above, large bold value below, comparison change indicator (green ↑ / red ↓) at the bottom. 4 across in a grid row.
- **Chart cards:** Same secondary background, 8px radius, chart title in small muted text, generous internal padding. Charts render with subtle opacity on data elements (bars, lines, dots). Hover tooltips on all data points.
- **Layout:** KPI row at top, 2-column chart grid below, full-width elements (tables, treemaps) span both columns.
- **Number formatting:** Always human-readable (£2.30M not £2297483, 5,009 not 5009, 12.5% not 0.125).
- **Comparisons:** Show as "↑ 12.3% vs last month" in green or "↓ 3.1% vs last month" in red. Percentage points for metrics already expressed as percentages (↓ 0.8pp).
- **Selected state:** When a chart is clicked, it gets a 2px accent border (info colour). All other cards remain in default state.
- **New items:** Charts added after generation show a small "new" badge (info background, top-right corner).
- **Animation:** Staggered fade-in on first render. Smooth transitions when configs change.

### Claude-inspired UI treatment

The chat input across all tabs uses a **floating pill-shaped bar** inspired by Claude's interface:
- Generous border-radius (20px) creating a pill shape
- Circular `+` attach button on the left
- Solid circular send button on the right with arrow icon
- Subtle border that darkens on hover
- "Enter to send · Shift+Enter for newline" hint below in muted tiny text
- The input floats at the bottom of the workspace with breathing room (not flush to edges)

All message bubbles use rounded corners. User messages are dark-background pills aligned right. Captain messages are left-aligned with no background (just text flowing naturally).

---

## 3. Auth & gating strategy

### Three tiers of access

**No account needed (session-based):**
- Upload data (CSV/Excel)
- Review schema on DATA tab
- Plan with Captain on PLAN tab
- Generate 1 dashboard on BUILD tab
- Edit via chat on BUILD tab
- Data lives in browser memory only
- Persistent subtle banner: "Sign up to save your work — you'll lose it if you close this tab"

**Account required (free tier):**
- Save projects to Supabase
- Download as PDF
- Publish on dashship.app subdomain (with "Powered by DashShip" badge)
- Multiple projects

**Paid plans (£29/79/199):**
- Custom domains
- Client branding (logo, colours)
- Remove "Powered by DashShip" badge
- Email reports (phase 2)
- Embedding with signed JWT

### Prompt preservation

If a user types a prompt on the logged-out home page and clicks Start:
1. Store prompt + any attached file in `sessionStorage`
2. Show auth modal: "We saved your prompt! Sign up to start building."
3. Two options: "Continue with Google" / "Continue with Email" / "Just trying it out"
4. "Just trying it out" → anonymous session, data in memory only
5. After auth → read from `sessionStorage` → create project → navigate to PLAN tab with prompt as first message

**Critical rule:** The user's prompt is NEVER lost. It carries through auth and appears as the first message to Captain.

---

## 4. Complete customer journey

### 4.1 HOME page

**Layout:**
- Header: DashShip_ logo, Pricing, Docs, Log in (logged out) or avatar (logged in)
- Sidebar (logged in only): collapsible, shows project list, search, resources
- Centre: headline, upload zone, chat box, example prompts, sample data cards

**Headline:** "Dashboards worth publishing."
**Subhead:** "Upload data, talk to Captain, publish under your brand."

**Upload zone:** Dashed border rectangle. "Drop CSV or Excel here, or click to browse."

**Chat box:** Pill-shaped input (Claude-inspired). Placeholder: "Build me a customer retention dashboard..." Attach file button. Start button.

**Example prompts:** Clickable pills below the chat box. Pre-fill the chat input when clicked. Examples: "Build a sales performance dashboard" / "Show me customer ordering patterns" / "Create a KPI tracker for monthly metrics"

**Sample data cards:** 3 cards below example prompts. Each shows dataset name, row count, field summary. Clicking a card creates a new project with that sample data loaded.

**Footer line:** "From £29/mo · No credit card · Your data stays yours"

**Three entry paths — all create a fresh project:**

| Action | What happens |
|--------|-------------|
| Upload a file | Create project → attach data source → navigate to DATA tab |
| Type a prompt + click Start | Create project → navigate to PLAN tab → prompt is first message |
| Click sample card | Create project → load sample CSV → navigate to DATA tab |

**Critical rule:** Every action creates a BRAND NEW project. No reusing previous state. No stale data.

---

### 4.2 DATA tab

**Purpose:** Review and clean the data. Captain acts as a data engineer.

**Layout:**
- Main workspace: data source name, row/column counts, schema/preview/metadata tabs, import options
- Right sidebar: Captain chat (data engineer persona)

**Schema view shows:**
- Fields grouped as DIMENSIONS and MEASURES
- Each field shows: icon (ABC/# /calendar/T-F), name, role badge, unique count or range, visibility toggle
- Fields are draggable between dimension/measure groups

**Import options:** Start on line N (skip header rows), delimiter selection, encoding.

**Captain behaviour on DATA tab — DATA ENGINEER persona:**

Captain automatically reviews the schema when data is loaded. It produces a list of **actionable recommendations**, each with an Approve button:

**Recommendation types:**
1. **Rename** — `invoice_no` → `Invoice Number`. Makes dashboard labels presentable.
2. **Reclassify** — Move field from measure to dimension or vice versa. "Order ID is detected as a number but it's an identifier — move to DIMENSION as a string."
3. **Type change** — "Postal Code detected as number, should be string." "Date field stored as text, needs parsing."
4. **Hide** — "Row ID is just an index. Hide it from the dashboard."

**Each recommendation is a card** in Captain's chat with:
- Clear explanation of WHY
- [Approve] button
- Option to dismiss/skip

**Approve All button** at the bottom for users who trust Captain completely.

**After all recommendations handled:**
Captain says: "Data looks clean. Ready to start planning your dashboard."
**Start Planning →** button appears / becomes prominent, navigating to PLAN tab.

**Hard rule: DATA tab Captain NEVER suggests dashboards or analysis.** It only talks about the data itself — field names, types, roles, quality. Analysis starts on the PLAN tab. This is enforced by using a different system prompt.

**What updates live:** When the user approves a recommendation, the schema view updates immediately. Reclassifying Order ID moves it from MEASURES to DIMENSIONS in the left panel in real time.

---

### 4.3 PLAN tab

**Purpose:** Design the dashboard through conversation. Captain acts as an analytics consultant.

**Layout:**
- Main workspace: conversation flow with **inline wireframe widgets** + chat input at the bottom (pill-shaped, Claude-inspired)
- Right sidebar: structured plan details (sheets list, calc fields, data toggle) + **Generate Dashboard** button

**The conversation IS the workspace.** Captain talks, wireframe widgets appear inline in the chat, user reacts, Captain updates the wireframe. This mirrors how Claude shows inline visualisations in this very chat.

**The inline wireframe widgets show:**
- Filter row (when filters proposed) — dropdown placeholders above KPIs
- KPI row — small cards with metric name, format icon (£, #, %), and formula
- Chart grid — cards with chart title, type label, and mini sketch previews (lines, bars, dots, h-bars)
- New/changed items highlighted with accent colour and ✦ marker
- Each subsequent wireframe in the conversation shows the updated layout, not the full history

**Chat input (bottom of workspace):** Pill-shaped floating bar (Claude-inspired, 20px border-radius), circular + attach button, solid round send button with arrow, "Enter to send · Shift+Enter for newline" hint below.

**Right sidebar contains:**
- Dashboard plan header (name, sheet count, calc field count, "PLANNING" status badge)
- CALCULATED FIELDS section with formula pills (approve/remove)
- SHEETS section listing each sheet (name + type badge: kpi/line/bar/table/scatter)
- DATA CONTEXT toggle (expands to show confirmed schema for reference)
- **Generate Dashboard** button (prominent, at bottom of sidebar)

**Captain behaviour on PLAN tab — ANALYTICS CONSULTANT persona:**

After data review is complete, Captain proposes a dashboard structure based on:
- The user's original prompt (carried from home page)
- The confirmed data schema and field roles
- The data profile (stats, distributions, correlations)

**Captain's first message includes an inline wireframe widget** showing:
- KPI row across the top (small cards with metric name, icon, formula)
- Chart grid below (2×2 or appropriate layout) with mini wireframe previews (sketch lines for line charts, sketch bars for bar charts, etc.)
- Table/detail section at the bottom

**The wireframe updates as the conversation progresses.** When Captain proposes a new chart, it appears in the wireframe. When the user says "swap the table for a treemap," the wireframe updates and Captain shows the new version inline.

**Conversation examples:**

User: "Build me a sales performance dashboard"
Captain: "Your Superstore data has 21 fields across 10K rows. Here's what I'd build:" → [inline wireframe widget] → "I've added a Profit_Margin calculated field. 19% of rows have negative profit — the sub-cat chart surfaces loss-makers. Your Discount field is unused — want a scatter to spot over-discounted products?"

User: "Yes add it. Also compare KPIs to last month."
Captain: "Done — scatter added, all KPIs now show month-over-month comparison with percentage change." → [updated wireframe widget]

**Captain proactively:**
- Flags unused fields that could be valuable
- Notes data quality issues (negative values, high cardinality)
- Proposes calculated fields with formulas
- Suggests filters based on available dimensions
- Asks if the user wants a detailed breakdown of what will be created

**Captain NEVER:**
- Offers A/B/C multiple choice options (unless genuinely ambiguous)
- Dumps long text lists of what it will build (uses wireframe widgets instead)
- Says "Sound good? I'll generate the plan now" prematurely — keeps planning until the user is ready
- Uses the word "Generate" — that's the user's action via the sidebar button

**Filters are part of the plan:**
Captain proposes filters during planning: "I'd add Date Range, Category, and Region filters across the top. All charts will cascade when a filter is selected."
Filters appear in the wireframe as a row above the KPIs.

**KPI comparisons are part of the plan:**
When user asks "compare to last month," Captain adds comparison config to each KPI sheet:
- Current value, previous period value, % change with ↑/↓ indicator
- Smart enough to use percentage points for metrics that are already percentages (e.g., margin)
- Supports: month-over-month, quarter-over-quarter, year-over-year, custom range

**Right sidebar contains:**
- Dashboard plan header (name, sheet count, calc field count)
- CALCULATED FIELDS section with formula pills
- SHEETS section listing each sheet (name + type: kpi/line/bar/table/scatter)
- DATA CONTEXT toggle (expands to show confirmed schema for reference)
- **Generate Dashboard** button (prominent, at bottom)

**Inline data editing in the sidebar DATA panel:**
When the DATA CONTEXT panel is expanded, fields are editable inline — no need to navigate back to the DATA tab:
- **Click a field name** → it becomes a text input. Type the new name, press Enter. Old name shows below ("was: Ship Mode") so changes are visible. Captain and plan update automatically.
- **Click the DIM/MEAS badge** → dropdown appears with reclassify options (Dimension ↔ Measure) and type change options (String, Number, Date). One click applies. Captain adjusts the plan — it won't try to SUM a postal code anymore.
- **Eye icon** → toggle field visibility (hide from dashboard).
- This eliminates the need to navigate back to the DATA tab to fix field issues mid-planning (eliminates N2 flow entirely).

**When the user clicks Generate Dashboard:**
- PlanningUnderstanding object (NOT chat history) is sent to generation prompt
- Navigates to BUILD tab
- Loading state with skeleton dashboard

---

### 4.4 BUILD tab

**Purpose:** View the generated dashboard with real data. Edit by chatting with Captain. Preview mobile and desktop layouts.

**Layout:**
- Main workspace: the actual rendered dashboard (KPIs, charts, tables, filters — all with real data) + Desktop/Mobile toggle at top
- Right sidebar: Captain chat panel with **continuous conversation** from PLAN phase + chat input at bottom

**Continuous conversation — the key design decision:**
The conversation does NOT reset when moving from PLAN to BUILD. Captain's chat in the BUILD sidebar is the SAME thread from planning. The planning messages are still there — scrolled up, slightly faded — with a subtle "Dashboard generated" divider marking the transition. BUILD-phase messages continue below seamlessly. This means:
- The user never "goes back to PLAN" to add a chart — they just say "add a customer segmentation chart" in the BUILD sidebar and it appears on the live dashboard
- The user never "goes back to PLAN" to add a filter — they say "add a Segment filter" and it appears
- The full context of why decisions were made is preserved in one thread
- This mirrors how Replit keeps the conversation continuous after generating code

**Desktop/Mobile toggle:**
A toggle bar at the top of the BUILD workspace lets the user switch between Desktop and Mobile preview. When Mobile is selected:
- The dashboard renders inside a phone frame so the user sees exactly what their client sees
- Captain auto-generates a sensible mobile layout with these rules:
  - KPIs: stay visible, 4-across becomes 2×2 grid
  - Charts: single-column stack, top 2-3 most important visible, rest collapsed under "+ N more charts" (tap to expand)
  - Tables: simplified (fewer columns, fewer rows) or hidden
  - Filters: collapse into a menu icon
  - Comparisons: shortened (↑12% not ↑12.3% vs last month)
- The user can override any of Captain's mobile decisions via chat: "Show the regional chart on mobile too" or "hide the scatter on mobile"
- Mobile layout is stored as a separate config — same data, different presentation
- Both layouts are published together

**What the user sees on first load:**
The dashboard renders with real data from their uploaded file. Staggered fade-in animation — charts appear one by one. KPIs show formatted numbers (£2.30M, not £2297483). Charts have hover tooltips, proper axes, responsive sizing.

**Click-to-inspect interaction:**
When the user clicks any chart or KPI on the dashboard:
1. The chart gets a highlight border (2px accent colour)
2. An info overlay appears showing HOW the chart is built:
   - Chart type (Line / Bar / H-Bar / Scatter / Table / KPI)
   - X-axis field + aggregation
   - Y-axis field + aggregation
   - Colour field (if any)
   - Sort order
   - Filters applied
   - For KPIs: the formula, comparison period, format
3. Captain's sidebar acknowledges the selection: "Revenue trend selected. It uses SUM(Sales) by Order Date (monthly)."

**Chat-to-edit interaction:**
The user types a change in Captain's chat input:
- "Make it weekly instead of monthly"
- "Add Region as colour"
- "Change to an area chart"
- "Filter out returns"
- "Sort by profit descending"
- "Add a target line at £200K"
- "Add a new monthly orders trend chart"
- "Add a Segment filter"

Captain returns a JSON config patch. The chart re-renders instantly. The info overlay updates to show the new bindings. New charts appear on the dashboard with a "new" badge.

**Regenerate via chat:**
If the user wants to start over after many edits, they just say "regenerate the whole dashboard from the plan" in chat. Captain rebuilds it. No need to navigate back to the PLAN tab.

**Technical flow:**
1. User's message + current sheet config + data schema → quick-command API call
2. Claude returns a JSON patch: `{encoding: {color: {field: "Region", type: "dimension"}}}`
3. Patch merged into sheet config
4. Chart component re-renders with new config

**No drag-and-drop. No shelves. No dnd-kit.** All editing is conversational. The info overlay provides transparency into what each chart is made of. The user reads it, decides what to change, tells Captain in natural language.

**Filters on the live dashboard:**
Filter controls render as dropdowns/date pickers above the KPI row. Selecting a filter value cascades to all charts and KPIs — exactly like Tableau's filter actions.

---

### 4.5 PUBLISH tab

**Purpose:** Configure and deploy the dashboard to a live URL.

**Layout:**
- Main workspace: publish settings form + preview
- Right sidebar: Captain (available for questions)

**Publish settings:**

**URL:** `[slug].dashship.app` — editable slug field

**Access level:** Three options as selectable cards:
- Public — anyone with the link
- Password — requires password entry
- Invited only — specific email addresses

**Branding:**
- Dashboard title (editable)
- Client logo upload
- Colour accent picker (preset palette + custom)
- "Powered by DashShip" badge toggle (removable on paid plans)

**Preview:** Mini wireframe of the published dashboard showing the header (logo + title), filter row, KPIs, chart grid, and badge placement.

**Publish button:** Full-width, prominent.

**After publish — success state:**
- Live URL displayed with Copy button
- Open in new tab button
- Embed code button (generates iframe snippet)
- Download PDF button
- Last published timestamp + view count

**Republish requirement:**
After a dashboard is published, edits on the BUILD tab do NOT go live automatically. The user sees a subtle indicator: "Unpublished changes" on the PUBLISH tab. They must click **Republish** to push changes live. This gives the user control — they can experiment on BUILD without affecting the live URL. Captain mentions this: "Your changes are saved but not yet live. Head to PUBLISH when you're ready to update."

**Auth gate:** If anonymous user reaches PUBLISH, show auth modal. After sign-up, their in-memory project migrates to Supabase, then publish continues.

---

## 5. Captain system prompts

### 5.1 DATA tab prompt (data engineer)

Captain's job: Review the schema. Propose renames, reclassifications, type changes, and field hiding. Each recommendation has an approve button. Never suggest dashboards or analysis.

Key instructions:
- Examine every field for name clarity, correct type, and correct role (dimension vs measure)
- Identify fields that are identifiers masquerading as numbers (Order ID, Customer ID, Postal Code)
- Identify fields that should be hidden (Row ID, internal indices)
- Propose human-readable names for technical field names
- Be concise — each recommendation is one clear sentence with reasoning
- Never mention dashboards, charts, KPIs, or analysis
- After all recommendations: "Data looks clean. Ready to start planning."

### 5.2 PLAN tab prompt (analytics consultant)

Captain's job: Propose a dashboard structure based on the user's intent and the data profile. Use inline wireframe widgets. Be thorough — flag unused fields, data quality notes, suggest calculated fields and filters.

Key instructions:
- Propose KPIs, charts, calculated fields, and filters
- Render proposals as structured JSON that populates inline wireframe widgets
- Proactively flag: unused fields, negative values, high cardinality, potential calculated fields
- Ask genuine consultant questions — not A/B/C quizzes
- Each response should update the wireframe when something changes
- Never say "Sound good? I'll generate now" — keep planning until the user initiates generate
- Support KPI comparisons (MoM, QoQ, YoY) when requested
- Support filter proposals based on available dimensions

### 5.3 BUILD tab prompt (quick commands)

Captain's job: Apply config patches to individual sheets based on natural language instructions. Stateless per command.

Key instructions:
- Receive: current sheet config + data schema + user's command
- Return: JSON patch to merge into the sheet config
- Examples: change chart type, swap axes, add colour encoding, change aggregation, add filter, change sort, add target line
- Be concise in chat: "Done — area chart, weekly, coloured by Region."
- When a chart is selected, acknowledge what it's made of before the user asks for changes

---

## 6. Data models

### Sheet config (core data structure)

```typescript
interface Sheet {
  id: string;
  projectId: string;
  dataSourceId: string;
  name: string;
  markType: 'bar' | 'line' | 'area' | 'scatter' | 'pie' | 'table' | 'kpi' | 'treemap';
  encoding: {
    columns?: FieldBinding;
    rows?: FieldBinding;
    color?: FieldBinding;
    size?: FieldBinding;
    label?: FieldBinding;
    tooltip?: FieldBinding[];
  };
  config: {
    orientation?: 'vertical' | 'horizontal';
    stacked?: boolean;
    showLegend?: boolean;
    showLabels?: boolean;
    smooth?: boolean;
    sort?: { field: string; order: 'asc' | 'desc' };
    limit?: number;
  };
  comparison?: {
    period: 'month_over_month' | 'quarter_over_quarter' | 'year_over_year' | 'custom';
    display: 'percentage' | 'absolute' | 'percentage_points';
    customRange?: { start: string; end: string };
  };
  filters: SheetFilter[];
}
```

### Field binding

```typescript
interface FieldBinding {
  field: string;
  type: 'dimension' | 'measure';
  aggregation?: 'sum' | 'avg' | 'count' | 'count_distinct' | 'min' | 'max' | 'none';
  format?: {
    type: 'number' | 'currency' | 'percent' | 'date' | 'string';
    decimals?: number;
    prefix?: string;
    suffix?: string;
    dateFormat?: string;
  };
}
```

### Calculated field

```typescript
interface CalculatedField {
  id: string;
  projectId: string;
  name: string;
  formula: string;
  description: string;
  resultType: 'number' | 'string' | 'date' | 'boolean';
}
```

### Dashboard layout

```typescript
interface DashboardLayout {
  columns: number; // Grid columns (default: 12)
  rowHeight: number; // Pixels per row unit (default: 60)
  filters: DashboardFilter[];
  items: Array<{
    sheetId: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  // Mobile layout — auto-generated by Captain, editable via chat
  mobile: {
    visibleSheetIds: string[]; // Which charts show above the fold
    collapsedSheetIds: string[]; // Hidden under "+ N more charts"
    hiddenSheetIds: string[]; // Fully hidden on mobile (e.g. wide tables)
    kpiColumns: number; // Default: 2 (2x2 grid)
    simplifiedSheets?: Record<string, { // Per-sheet mobile overrides
      limit?: number; // e.g. Top 5 instead of Top 10
      hiddenFields?: string[]; // e.g. hide Profit, Qty columns on mobile table
      shortenComparisons?: boolean; // ↑12% instead of ↑12.3% vs last month
    }>;
  };
}
```

### PlanningUnderstanding (sent to generation, NOT chat history)

```typescript
interface PlanningUnderstanding {
  audience: string;
  objective: string;
  kpis: Array<{ name: string; formula: string; format: string; comparison?: ComparisonConfig }>;
  charts: Array<{ name: string; type: string; xField: string; yField: string; colorField?: string; config?: object }>;
  calculatedFields: Array<{ name: string; formula: string; resultType: string }>;
  confirmedFieldRoles: Record<string, 'dimension' | 'measure'>;
  filters: Array<{ field: string; type: 'date_range' | 'multi_select' | 'single_select' }>;
  layout: string; // Description: "KPI row top, 2x2 chart grid, table bottom"
}
```

---

## 7. Project hub (returning users)

When a returning user clicks a project in the sidebar, they land on the **project hub** — an overview of that project's dashboards and data sources.

### Layout

- **Header:** Project name, metadata (X data sources · Y dashboards · created date)
- **Dashboards section (top, prominent):** Grid of dashboard cards + "+ Create new dashboard"
- **Data sources section (below):** Grid of data source cards + "+ Upload data"

### Dashboard cards show:
- Mini preview thumbnail (KPI values, tiny chart shapes)
- Dashboard name
- Short description
- Source pills (blue badges showing which CSVs feed this dashboard)
- Status (Published with green dot / Draft with gray dot)
- Stats: KPI count, chart count, last edited

### "+ Create new dashboard" card:
- Dashed border, centered plus icon
- "Pick from your data sources or upload new data."
- Clicking goes to PLAN tab where Captain knows the existing data sources: "You have sales, sessions, and returns data. Which should this dashboard use?"

### Data source cards show:
- File type (CSV)
- File name
- Row count, field count
- Usage: "Used in 2 dashboards" or "Not used yet"

### Sidebar structure:
- Home
- Search
- PROJECTS section:
  - Acme Corp Sales (expandable)
    - Sales Dashboard
    - Sessions Analysis
    - + New dashboard
  - BigCo HR
  - Personal KPIs
- + New Project
- RESOURCES section:
  - Docs

**Key rule:** Sidebar shows projects and dashboards only. No data sources in the sidebar — they live on the project hub page.

---

## 8. Data ownership model (Option A — project-level)

Data sources belong to the **project**, not to individual dashboards. Dashboards reference whichever project-level sources they need.

### Hierarchy:
```
Project
├── Data Sources (project-level pool)
│   ├── sales-2024.csv
│   ├── sessions-q1.csv
│   └── returns.csv
├── Dashboards (reference sources from the pool)
│   ├── Sales Dashboard (uses: sales-2024.csv)
│   └── Sessions Analysis (uses: sessions-q1.csv, sales-2024.csv)
```

### Why this model:
- Data uploaded once, referenced by multiple dashboards
- Clear visibility: each data source shows "Used in N dashboards"
- Unused data sources ("Not used yet") prompt creation of new dashboards
- Maps to Tableau's mental model (data sources are project-level assets)
- When creating a new dashboard, Captain sees all available sources and asks which to use

### When creating a new dashboard within a project:
Captain says: "You have three data sources in this project — sales, sessions, and returns. Which should I use for this dashboard, or should I upload something new?"

### Each dashboard card shows source pills:
Blue badges on each dashboard card make the data→dashboard relationship visible at a glance without clicking into anything.

---

## 9. User journey permutations

### 9.1 Entry flows (E1–E8)

**New users:**

| ID | Scenario | Flow |
|----|----------|------|
| E1 | New user, anon, types prompt only | Home → type prompt → Start → "Just trying it out" → create project → PLAN tab |
| E2 | New user, anon, prompt + file | Home → type prompt + attach CSV → Start → "Just trying it out" → create project + parse → PLAN tab |
| E3 | New user, anon, file only | Home → drop CSV → "Just trying it out" → create project + parse → DATA tab |
| E4 | New user, anon, sample card | Home → click sample → "Just trying it out" → create project + load sample → DATA tab |
| E5 | New user, signs up first | Home → type prompt → Start → signs up → prompt preserved → create project in Supabase → PLAN tab |

**Returning users:**

| ID | Scenario | Flow |
|----|----------|------|
| E6 | Returning user, new project | Home (sees sidebar with projects) → types new prompt → Start → NEW project created → PLAN tab |
| E7 | Returning user, resumes project | Home → clicks project in sidebar → project hub → clicks dashboard card → opens at last active tab |
| E8 | Returning user, adds data | Inside project hub → "+ Upload data" → new source added to project pool → Captain reviews on DATA tab |

### 9.2 Project & workspace structure (P1–P6)

| ID | Scenario | Description |
|----|----------|-------------|
| P1 | One project, one dashboard | Simple happy path. Upload → plan → generate → publish. |
| P2 | One project, multiple dashboards | Same data, different views. Sales Dashboard + Shipping Analysis from same CSV. |
| P3 | One project, multiple data sources | Upload sales CSV, later upload sessions CSV. Both in project pool. |
| P4 | Multiple projects | Consultant has Acme, BigCo, Personal projects. Each independent. |
| P5 | Create project first, data later | "+ New Project" in sidebar → empty project → DATA tab with upload prompt. |
| P6 | Start from chat, no data | Type "plan a charity dashboard" → project created → PLAN tab → Captain asks for data. |

### 9.3 Mid-journey navigation (N1–N7)

| ID | Scenario | Description |
|----|----------|-------------|
| N1 | Happy path (linear) | DATA → PLAN → BUILD → PUBLISH |
| N2 | Fix field during PLAN | **ELIMINATED** — expand data panel in PLAN sidebar, edit field name/type inline, no tab switch needed |
| N3 | Add chart after BUILD | **ELIMINATED** — continuous conversation means user just says "add a chart" on BUILD tab, Captain adds it to the live dashboard |
| N4 | Skip DATA review | Upload → immediately click PLAN → Captain works with unreviewed schema |
| N5 | Regenerate from scratch | User says "regenerate the whole dashboard" in BUILD chat → Captain rebuilds. No tab navigation needed. |
| N6 | Upload new data mid-project | On BUILD tab → DATA tab → upload new CSV → BUILD → dashboard re-renders |
| N7 | Edit published dashboard | Dashboard is live → edit on BUILD → changes saved but NOT live → must Republish on PUBLISH tab |

### 9.4 Edge cases (X1–X9)

| ID | Scenario | Handling |
|----|----------|----------|
| X1 | Anonymous user closes tab | Data lost. Mitigation: persistent banner + beforeunload warning. |
| X2 | Malformed CSV | Parser fails gracefully. Captain: "Couldn't parse. Try UTF-8 CSV." |
| X3 | Excel with multiple sheets | Show sheet picker before parsing. |
| X4 | Generation fails (API error) | Show error + retry button. Captain: "Hit a snag. Retry or simplify." |
| X5 | No numeric fields | Captain: "All text — I can build a searchable table, or upload data with numbers." |
| X6 | Impossible request for data | Captain: "No date field available. I can show by category instead." |
| X7 | URL slug taken | Inline error + auto-suggest alternatives. |
| X8 | Anonymous hits generation limit | Auth modal: "Sign up to continue." |
| X9 | Direct URL navigation to tab | Guard check: prerequisite state exists? If not, redirect to appropriate earlier tab. |

---

## 10. State management rules

### Project creation
- Every home page action creates a NEW project
- No reuse of previous project state
- Project auto-named from the prompt or data source name

### Data source attachment
- Data source is attached to a specific project ID
- The project ID must be set BEFORE the data source is created
- No race conditions — await project creation before data upload

### Planning session
- Planning session is scoped to a project ID
- Chat messages belong to the planning session, not global state
- When navigating to PLAN tab, load messages for THIS project's session only
- Clear any previous chat state on mount when project ID changes

### Anonymous sessions
- All state in React state + sessionStorage
- No Supabase writes until auth
- `migrateToAuth()` function writes everything to Supabase after sign-up

---

## 11. Phase 2 features (post-launch)

- **AI daily commentary:** Captain generates natural language summaries of daily changes on each chart
- **Email reports:** Scheduled HTML/PDF snapshots sent to stakeholders via Resend
- **Custom domains:** Map your own domain to published dashboards
- **Dynamic sample data generation:** Captain generates tailored CSV based on user's description (charity donations, loan utilisation, etc.)
- **Embedding:** Signed JWT URLs for iframe embedding in client portals
- **BigQuery connector:** Direct connection without CSV export

---

## 12. Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v4 |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| AI | Anthropic Claude API (claude-sonnet-4-5-20250929) |
| Charts | Recharts |
| Layout | React Grid Layout |
| Icons | Lucide React |

---

## 13. Key principles

1. **Captain prompt discipline:** Keep system prompts simple. Different prompt per tab. Over-editing degrades behaviour.
2. **No A/B/C quizzes:** Captain gives professional advice, not multiple choice. Options only for genuinely ambiguous situations.
3. **Build and iterate over planning:** Concrete code problems yield better results than abstract planning.
4. **Prompt never lost:** User's typed prompt carries through auth and appears as first Captain message.
5. **Every action creates fresh state:** No stale data, no reused sessions, no cross-project contamination.
6. **Each tab has one job:** DATA = clean. PLAN = design. BUILD = refine. PUBLISH = ship.
7. **Editing is conversational:** Click chart → see formula → tell Captain → chart updates. No drag-and-drop shelves.
8. **Wireframes are inline:** Planning wireframes appear inside the conversation flow, not in a separate panel.
9. **Conversation is continuous:** PLAN and BUILD share one chat thread. No context loss between phases. User never needs to "go back."
10. **Mobile is a first-class layout:** Every dashboard has a desktop and mobile config. Captain auto-generates the mobile version. User can customise via chat.
11. **Republish gives control:** Edits on BUILD don't go live automatically. User must explicitly Republish. Safe to experiment.
12. **Data lives at project level:** Data sources belong to the project pool. Dashboards reference what they need. Upload once, use in multiple dashboards.
13. **The dashboard rendering style IS the brand:** Rounded corners, secondary backgrounds on cards, formatted numbers, subtle opacity on chart elements, staggered fade-in. This visual quality is non-negotiable.
