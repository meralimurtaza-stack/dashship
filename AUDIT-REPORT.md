# DashShip Codebase Audit Report

**Date:** 2026-03-15
**Branch:** `redesign/home-page-replit-flow`
**Auditor:** Claude Code (Opus 4.6)

---

## PART 1: USER JOURNEY AUDIT

### 1.1 Home Page → First Action

**Component:** `frontend/src/pages/Home.tsx` (484 lines)
**Layout controller:** `frontend/src/components/layout/AppLayout.tsx` (336 lines)

The home page renders:
- Greeting with ShipWheel icon: *"Hi, let's ship that dashboard"*
- Upload zone (drag & drop CSV/TSV/XLSX/XLS)
- Chat input with placeholder: *"Describe what you need, Captain will take the wheel..."*
- Sample data cards (only if user has no projects)
- Example prompts (only if user has no projects)
- Your Projects section (horizontal scrollable cards)
- Your Dashboards section (draft cards)

#### a) Types a message and hits send

```typescript
// Home.tsx:342-344
const handleChat = useCallback((message: string) => {
  const projectName = message.slice(0, 40).replace(/[^\w\s-]/g, '').trim()
  onChatStarted(message, projectName)
}, [onChatStarted])
```

⚠️ **Project name is the first 40 chars of the chat message.** This is why you see names like "I want to create a cu..." — the chat message is truncated and used verbatim as the project name. No smart titling, no AI summary.

The callback chain:
1. `Home.onChatStarted` → `AppLayout.handleChatStarted` (line 127)
2. Sets `pendingMessage`, `pendingProjectName`, navigates to `'Chat'` page
3. `ChatPage` receives `initialMessage` prop

**No API call is made.** No project is created in Supabase. The "project name" exists only in React state.

#### b) Drops a file in the upload zone

```typescript
// Home.tsx:337-340
const handleFile = useCallback((file: File) => {
  const projectName = file.name.replace(/\.[^.]+$/, '')
  onFileUploaded(file, projectName)
}, [onFileUploaded])
```

✅ Project name is the filename without extension (e.g., `sales-data.csv` → `"sales-data"`). Navigates to `DataPage` with the file as `initialFile`.

#### c) Clicks a sample data card

```typescript
// AppLayout.tsx:135-158
const handleSampleSelected = useCallback(async (sampleKey: string, projectName: string) => {
  const sampleFiles: Record<string, string> = {
    sales: '/samples/sales-data.csv',
    hr: '/samples/hr-data.csv',
    ecommerce: '/samples/ecommerce-data.csv',
  }
  const resp = await fetch(url)
  const blob = await resp.blob()
  const file = new File([blob], `${sampleKey}-data.csv`, { type: 'text/csv' })
  setPendingFile(file)
  setActivePage('Data')
})
```

✅ Fetches CSV from `/public/samples/`, creates a `File` object, navigates to DataPage.

⚠️ Sample cards only visible when `!hasProjects` — users with 1+ projects never see them again.

#### d) Clicks an existing project card

```typescript
// AppLayout.tsx:160-166
const handleProjectSelected = useCallback((project: Project) => {
  setCurrentProject(project)
  setSidebarCollapsed(false)
  setPendingFile(null)
  setPendingMessage(null)
  setActivePage('Chat')
}, [setCurrentProject])
```

Navigates to ChatPage. No `initialMessage` or `initialFile` passed — ChatPage shows SourceSelector to pick a data source.

---

### 1.2 Project Creation Flow

❌ **There is no explicit project creation.** The concept of "project" is a thin wrapper around `DataSource`:

```typescript
// ProjectContext.tsx
const refreshProjects = useCallback(async () => {
  const sources = await listDataSources()
  const mapped: Project[] = sources.map((ds) => ({
    id: ds.id,
    name: ds.name,
    dataSource: ds,
    createdAt: ds.createdAt,
    updatedAt: ds.updatedAt,
  }))
  setProjects(mapped)
}, [])
```

A "project" is created implicitly when a data source is saved to Supabase in the DataPage. There is no `projects` table — the `data_sources` table IS the project list.

⚠️ **Project naming logic:**
- File upload: filename without extension (`sales-data.csv` → `"sales-data"`)
- Chat message: first 40 chars, stripped of special chars (`"I want to create a customer..."` → `"I want to create a customer"`)
- Sample: hardcoded name from sample card component

**After "project creation"** (data source saved), the user is still on the DataPage. They see schema/preview tabs and can click "Start Planning" to go to ChatPage.

---

### 1.3 Data Page

**Component:** `frontend/src/pages/DataPage.tsx` (417 lines)

**What it shows:**
- Upload interface (if no file yet) OR editable data source name
- File processing progress bar
- CSV options panel (delimiter, header row)
- Three tabs: **Schema** | **Preview** | **Metadata**
- ChangeLog and AdvancedStats panels
- "Start Planning" button at bottom
- CaptainSidebar on the right (chat + generate button)

✅ **User can upload data here** — there's a "Replace data" / re-upload capability.

**Auto-processing on mount:**
```typescript
// DataPage.tsx:104-109
useEffect(() => {
  if (initialFile && !initialProcessed && ds.stage === 'idle') {
    setInitialProcessed(true)
    ds.processFile(initialFile)
  }
}, [initialFile, initialProcessed, ds])
```

**Auto-sends opening message to Captain once data is ready:**
```typescript
// DataPage.tsx:138-147
// Sends: "I've loaded [sourceName] — X rows with Y dimensions and Z measures.
// What patterns do you see? What dashboards should I build?"
```

**Relationship between files and project:** One file = one data source = one "project". The file is uploaded to Supabase Storage, and metadata (schema, profile) saved to `data_sources` table. The `data_source_id` links to dashboards.

✅ Can generate a dashboard directly from the DataPage (via CaptainSidebar's Generate button).

---

### 1.4 Plan Page — THE CRITICAL BROKEN STEP

**Component:** `frontend/src/pages/ChatPage.tsx` (282 lines)

#### What renders when there's no chat history yet?

When `!selectedSource || !dataContext`:
```typescript
// ChatPage.tsx:172-177
if (!selectedSource || !dataContext) {
  return (
    <div className="h-full flex flex-col">
      <SourceSelector sources={sources} loading={loadingSources} onSelect={setSelectedSource} />
    </div>
  )
}
```

❌ **This is why you see "Choose a data source" with massive empty space.** The `SourceSelector` component takes up the full page height but only renders a small header + a list of saved data sources. If the user has one source it's a single clickable item with 90%+ empty whitespace. If the user has zero sources, it's entirely empty with no CTA.

#### Why does it show this?

When navigating from Home via chat input, the flow is:
1. `AppLayout` sets `pendingMessage` and navigates to `'Chat'`
2. `ChatPage` receives `initialMessage` but has no `selectedSource`
3. ChatPage loads sources from Supabase: `const { sources, loading: loadingSources } = useDataSources()`
4. Until user selects a source, the SourceSelector gate blocks the chat

⚠️ **Dead end if no sources exist:** No "Upload Data" button. User must navigate back to Home.

#### What happens after selecting a data source?

The component re-renders with `selectedSource` set. Now it shows:
- Header bar with source name + back button
- ConversationStarters (3-5 suggested prompts) if no messages
- Message area + chat input
- DataContextPanel on the right (collapsible)
- Generate Dashboard button (appears after ≥1 message exchange)

If `initialMessage` was provided, it auto-sends:
```typescript
// ChatPage.tsx:84-90
if (initialMessage && !initialSent && selectedSource && dataContext && !isStreaming && messages.length === 0) {
  setInitialSent(true)
  sendMessage(initialMessage)
}
```

#### Where does Captain chat appear?

- **DataPage:** `CaptainSidebar` (right panel) or `CaptainFullPage` (overlay toggle)
- **ChatPage:** Inline (full page chat interface, not CaptainSidebar/CaptainFullPage)
- **EditorPage:** `CaptainPanel` (right sidebar, reuses chat components)

⚠️ **Three different chat surfaces** share the `useChat` hook but have independent message state. Messages from DataPage don't persist into ChatPage unless passed via `chatMessages` callback chain.

#### What triggers transition from planning to building?

The "Generate Dashboard" button appears when `hasMessages && !isStreaming`:
```typescript
// ChatPage.tsx:181
const canGenerate = hasMessages && !isStreaming
```

Clicking it:
1. Builds conversation summary from messages
2. Calls `generateDashboard(dataContext, summary)` — POST to `/api/generate`
3. Downloads actual data rows from Supabase Storage
4. Validates field names in generated sheets against data columns
5. Saves as draft via `saveDashboard()`
6. Calls `onDashboardGenerated()` → AppLayout navigates to `'Dashboards'` (EditorPage)

---

### 1.5 Build Page

**Component:** `frontend/src/pages/EditorPage.tsx` (364 lines)

**What renders:** Three-panel layout:
- **Left:** FieldsPanel (draggable data fields + calculated fields)
- **Center:** DashboardCanvas (12-column grid with charts)
- **Right:** CaptainPanel (chat history from planning + input)
- **Header:** Back button, editable dashboard name, sheet count, Captain toggle, Publish button

**How it receives the dashboard spec:**
```typescript
// AppLayout.tsx:275-285
<EditorPage
  dashboardId={dashCtx.dashboardId}
  dashboard={dashCtx.dashboard}
  data={dashCtx.data}
  columns={dashCtx.columns}
  dataContext={dashCtx.dataContext}
  chatMessages={dashCtx.chatMessages}
  onBackToChat={handleBackToChat}
/>
```

`dashCtx` is set by `handleDashboardGenerated` callback which packages the generated dashboard spec, raw data, columns, and chat messages.

✅ **Auto-saves** on changes (debounced 2 seconds) via `saveDashboard()`.

**Can the user go back to planning?** Yes, via Back button → `handleBackToChat` → `setActivePage('Chat')`.

⚠️ **But going back loses context.** When resuming the draft later:
```typescript
// AppLayout.tsx:199-207
setDashCtx({
  dashboardId: draft.id,
  dashboard,
  data: draft.data,
  columns: [],          // ← empty!
  dataContext: null,     // ← null!
  chatMessages: [],     // ← empty!
})
```
The columns, dataContext, and chatMessages are NOT persisted in the dashboards table, so they're lost on draft resume.

---

### 1.6 Publish Page

**Component:** `frontend/src/components/publish/PublishModal.tsx` (466 lines)

**What renders:** Modal overlay with two tabs:
- **Publish tab:** URL slug, access level (Public/Password/Invite Only), client branding (logo, color, font, "Powered by DashShip" toggle), embed toggle
- **Email Reports tab:** EmailReportConfig component

**Does publishing work end-to-end?** ✅ Yes.

The publish flow:
1. Frontend sends `PublishRequest` to `POST /api/publish` (backend/app/routes/publish.py:67-105)
2. Backend upserts to `published_dashboards` table (or in-memory fallback)
3. Returns `{ slug, url: "/view/{slug}" }`
4. Frontend updates draft status to `'published'` via `saveDashboard()`
5. Modal shows success screen with URL and embed code

**Viewer endpoint:** `GET /api/view/{slug}` returns full dashboard data (sheets, layout, data). Password-protected dashboards return empty data until authenticated via `POST /api/view/{slug}/auth`.

**After publishing, does published status show up?**

❌ **Project card on home page:** No. The Home page shows `projects` (which are data sources) and `drafts` (dashboards with any status). Dashboard cards show `draft.status` but only as a styled badge — there's no filter for published vs draft.

❌ **Sidebar project tree:** No. The sidebar only shows data sources (projects). It has no awareness of dashboards or published state.

❌ **Breadcrumb:** No. Breadcrumbs show `Home / ProjectName / Build` — no published indicator.

⚠️ **No navigation after publish.** Modal stays open. User must click X to close. No toast, no redirect to the published URL.

---

### 1.7 Sidebar Navigation

**Component:** `frontend/src/components/layout/Sidebar.tsx` (132 lines)

**What it shows:**
- "Workspace" header
- List of projects (= data sources) with folder icons
- Active project shows row count + field count
- Delete button (hover-reveal) per project
- "New Project" button → navigates to Home
- Free plan progress bar (X / 3 projects)

**Sidebar visibility:** Only shown when `projects.length > 0` (AppLayout.tsx:41).

❌ **Does not update when new projects/dashboards are created** without an explicit `refreshProjects()` call. The DataPage calls it after saving, but if the user navigates away before saving, the sidebar is stale.

❌ **Published dashboards are NOT visible in the tree.** The sidebar only lists data sources. There's no dashboard sub-tree, no published indicator, no link to viewer URLs.

⚠️ **No dashboard navigation from sidebar.** To access a dashboard, user must go Home and click a draft card.

---

### 1.8 Unused Components

❌ **WorkflowStepper** (`frontend/src/components/layout/WorkflowStepper.tsx`, 75 lines) — Defined but never rendered. Shows `Upload → Review → Plan → Build → Publish` steps.

❌ **ProjectsPage** (`frontend/src/pages/ProjectsPage.tsx`, 250 lines) — Defined but not routed. Would show a grid of project cards. Unreachable.

---

## PART 2: FUNCTIONALITY AUDIT

### 2.1 Captain Chat System

#### Backend: `backend/app/routes/chat.py` (98 lines)

**System prompt (exact text):**
```
You are a dashboard planning consultant for DashShip. The user has uploaded a dataset
and wants to create a production-ready dashboard. You have their data profile below.
Help them by: 1. Understanding what questions they want their dashboard to answer
2. Suggesting specific visualisations based on their data 3. Recommending which fields
to use for each chart 4. Building toward a concrete dashboard plan Be concise and
specific. Reference their actual field names. When you have enough information,
summarise a dashboard plan with specific charts, fields, and layout.

## Data Profile

**Source:** {source_name}
**Rows:** {row_count}

**Dimensions ({count}):**
  - FieldName (type) — e.g. sample1, sample2, sample3, sample4

**Measures ({count}):**
  - FieldName (type) — e.g. sample1, sample2, sample3
```

**Data context sent to AI:** Source name, row count, dimension names/types/samples (4 samples each), measure names/types/samples (3 samples each). **No raw data rows sent.**

**How plan/spec is extracted:** ⚠️ **It isn't.** The chat endpoint streams raw text. There is no structured plan extraction on the backend. The frontend simply displays the streamed Markdown. The user reads the plan and manually clicks "Generate Dashboard" — which triggers a completely separate API call to `/api/generate` with the conversation summary as plain text.

**Message format:** Simple `text/plain` streaming response. Frontend reads chunks via `ReadableStream`:
```typescript
// chat-api.ts:28-38
const reader = res.body?.getReader()
const decoder = new TextDecoder()
while (true) {
  const { done, value } = await reader.read()
  if (done) break
  onChunk(decoder.decode(value, { stream: true }))
}
```

#### Frontend Chat Components

**Message rendering** (via `ChatMessage` component):
- User messages: dark background (`bg-gray-900 text-white`)
- Assistant messages: Markdown rendered via `<Markdown>` component
- No action buttons, approval buttons, or structured plan cards

**Plan storage:** ⚠️ Messages stored only in React state via `useChat` hook (`useState<ChatMessage[]>([])`). **Not persisted to Supabase.** Lost on page refresh.

**Three independent chat surfaces:**
1. `CaptainSidebar` (DataPage right panel) — `frontend/src/components/data/CaptainSidebar.tsx`
2. `CaptainFullPage` (DataPage overlay) — `frontend/src/components/data/CaptainFullPage.tsx`
3. Inline chat (ChatPage) — built into `ChatPage.tsx`

Each instantiates its own `useChat()` hook. Messages from DataPage's Captain are passed to EditorPage via the `chatMessages` callback chain but not to ChatPage.

---

### 2.2 Dashboard Generation Pipeline

**Full path: "Generate Dashboard" click → rendered dashboard:**

**Step 1: Frontend trigger** (ChatPage.tsx:105-170 or DataPage.tsx:192-225)
```typescript
const summary = messages.map(m => `${m.role === 'user' ? 'User' : 'Captain'}: ${m.content}`).join('\n\n')
const result = await generateDashboard(dataContext, summary)
```

**Step 2: API call** — `POST /api/generate` (`backend/app/routes/generate.py`)

**Step 3: Backend handler:**
1. Builds system prompt with data profile + strict JSON schema + 13 rules
2. Sends conversation summary as user message: `"Based on the following dashboard planning conversation, generate a complete dashboard: {summary}"`
3. Calls `client.messages.create()` with `claude-sonnet-4-5-20250929`, `max_tokens=4096`
4. Strips markdown code fences if present
5. Parses JSON
6. Validates field references against data columns → returns warnings
7. Injects `dataSourceId` and `projectId` into each sheet
8. Returns `{ dashboard, warnings }`

**Step 4: Dashboard spec structure:**
```json
{
  "name": "Dashboard Title",
  "sheets": [
    {
      "id": "sheet-1",
      "name": "Chart Title",
      "markType": "bar",
      "encoding": {
        "columns": { "field": "Region", "type": "dimension", "aggregation": "none" },
        "rows": { "field": "Revenue", "type": "measure", "aggregation": "sum" },
        "color": null, "size": null, "label": null, "tooltip": [], "detail": []
      },
      "config": { "orientation": "vertical", "stacked": false, ... },
      "filters": []
    }
  ],
  "layout": { "columns": 12, "rowHeight": 60, "items": [{ "sheetId": "sheet-1", "x": 0, "y": 0, "w": 6, "h": 5 }] }
}
```

**Step 5: Frontend rendering** — `DashboardRenderer.tsx` maps `sheet.markType` to chart components:
```
text → KPICard
bar → BarChart
line/area → LineChart (with area fill toggle)
pie → PieChart
scatter → ScatterPlot
table → DataTable
```

Each chart receives processed data via `processSheet()` from the data engine.

**Step 6: Chart types supported:** bar, line, area, scatter, pie, text (KPI), table — 7 types total.

**Step 7: Calculated fields:** Supported via `formulaParser.ts` + `formulaEvaluator.ts`. Applied as the first step in the data pipeline before filters and aggregation. Supports: `SUM`, `AVG`, `COUNT`, `MIN`, `MAX`, `ABS`, `ROUND`, `IF`, `DATEDIFF`, `DATEADD`, `TODAY`, arithmetic operators.

⚠️ **Warnings from validation are returned but never shown to the user** — they're logged to console only.

---

### 2.3 Data Management

**CSV parsing:** Papa Parse (`frontend/src/engine/parser.ts`). Supports custom delimiter, header row selection, dynamic typing disabled (types inferred separately).

**XLSX parsing:** XLSX library, same parser module.

**Storage:**
1. File binary → Supabase Storage bucket `data-files`
2. Metadata → `data_sources` table (schema JSONB, profile JSONB)

**Field type detection** (`frontend/src/engine/profiler.ts`):
- String columns → `dimension`
- Number columns → `measure`
- Date columns → `dimension`
- Column name heuristics (e.g., "ID", "Name" → dimension; "Revenue", "Amount" → measure)

**Data flow to charts:**
```
Supabase Storage (file) → download → Papa Parse → raw rows
                                                      ↓
processSheet(rows, sheet, calculatedFields):
  1. applyCalculatedFields() — adds computed columns
  2. applyFilters() — filters by SheetFilter conditions
  3. extractDimensions/extractMeasures() — reads encoding fields
  4. aggregate() — groups by dims, applies aggregations
  5. flattenAggregateResults() — converts to flat rows
  6. sortRows() — sorts by config.sort
  7. limitRows() — caps result set
                                                      ↓
                                              Chart component props
```

**Data preview:** ✅ DataPage has a "Preview" tab showing raw data in a table.

⚠️ **Entire data array stored in `dashboards.data` JSONB column.** For large datasets, this could hit PostgreSQL row size limits or cause slow queries.

---

### 2.4 Project & Dashboard Data Model

**Supabase tables:**

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `data_sources` | Uploaded files + schema | `id`, `project_id`, `name`, `file_name`, `file_type`, `storage_path`, `schema` (JSONB), `profile` (JSONB) |
| `dashboards` | Draft/saved dashboards | `id`, `data_source_id`, `name`, `status`, `sheets` (JSONB), `layout` (JSONB), `data` (JSONB), `published_slug` |
| `published_dashboards` | Public viewer dashboards | `id`, `slug` (unique), `dashboard_name`, `access_level`, `password_hash`, `allowed_emails`, `branding`, `sheets`, `layout`, `data` |
| `email_schedules` | Scheduled email reports | `id`, `dashboard_id`, `recipients`, `frequency`, `day_of_week`, `time_utc`, `format` |

**Relationships:**
```
data_sources (1) ←── (N) dashboards
                              ↓ (publish)
                     published_dashboards
                              ↓ (schedule)
                     email_schedules
```

❌ **No `projects` or `workspaces` table.** "Project" is a frontend abstraction over `data_sources`. There's a `project_id` column on `data_sources` that defaults to NULL and is never set by the frontend code.

✅ **Can a project have multiple dashboards?** Yes — `dashboards.data_source_id` is a foreign key, and multiple dashboards can reference the same data source.

⚠️ **Data duplication:** Published dashboards store a full copy of sheets, layout, and data. No reference back to the draft dashboard — changes to the draft don't propagate.

⚠️ **RLS policy is permissive:** `USING (true) WITH CHECK (true)` — all rows visible to all users. No user-scoped access control.

---

## PART 3: DATA VISUALISATION AUDIT

### 3.1 Chart Components

**Location:** `frontend/src/components/charts/`

| Component | File | Recharts Components | Status |
|-----------|------|---------------------|--------|
| BarChart | `BarChart.tsx` (155 lines) | `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend` | ✅ |
| LineChart | `LineChart.tsx` (154 lines) | `ComposedChart`/`LineChart`, `Line`, `Area`, `XAxis`, `YAxis`, `Tooltip`, `Legend` | ✅ |
| PieChart | `PieChart.tsx` (169 lines) | `PieChart`, `Pie`, `Cell`, `Tooltip`, `Legend` | ✅ |
| ScatterPlot | `ScatterPlot.tsx` (180 lines) | `ScatterChart`, `Scatter`, `XAxis`, `YAxis`, `ZAxis`, `Tooltip`, `Legend` | ✅ |
| DataTable | `DataTable.tsx` (176 lines) | N/A (pure HTML table) | ✅ |
| KPICard | `KPICard.tsx` (147 lines) | `AreaChart`, `Area` (sparkline) | ✅ |

**Chart config:** `frontend/src/components/charts/chartConfig.ts` — Monochrome palette (`#0E0D0D`, `#525252`, `#2A9D8F`, `#a1a1a0`, `#737373`, `#d4d4d2`, `#404040`, `#e09f3e`), IBM Plex Mono axis labels at 10px.

**Data flow:** Raw CSV → `processSheet()` engine → chart props. Each chart component receives pre-aggregated data, so chart components are pure renderers.

**Chart features:**
- ✅ BarChart: vertical/horizontal, stacked, labels, legend
- ✅ LineChart: area fill toggle, smooth curves (monotone/linear), date axis formatting
- ✅ PieChart: donut mode with center label, smart label hiding (<4% slices)
- ✅ ScatterPlot: color grouping by dimension, size via ZAxis (40-400px range)
- ✅ DataTable: column sorting (click headers), pagination (25/page), auto-numeric right-alignment
- ✅ KPICard: sparkline trend, delta % calculation, number/currency/percent formatting

---

### 3.2 Dashboard Layout

**Grid system:** CSS Grid, 12 columns, configurable row height (default 60px).

```typescript
// DashboardRenderer.tsx:150-154
<div className="grid gap-4"
     style={{
       gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
       gridTemplateRows: `repeat(${maxRow}, ${layout.rowHeight}px)`,
     }}>
```

Items positioned with `gridColumn: ${x+1} / span ${w}` and `gridRow: ${y+1} / span ${h}`.

**dnd-kit integration:**
- ✅ `DndContext` wraps the EditorPage
- ✅ `useDraggable()` on field items in FieldsPanel
- ✅ `useDroppable()` on shelf zones in SheetEditor
- ✅ Visual feedback: border accent + background on drag-over
- ✅ Field pills with aggregation cycling on shelves

**Chart resizing** (DashboardCanvas.tsx):
- ✅ SE-resize handle on hover (bottom-right corner)
- ✅ Pointer events for real-time tracking
- ✅ Grid snapping: `Math.round(startW + dx / colWidth)`, clamped to 2-12 columns
- ✅ Min size: 2 columns wide

**Size/position storage:** `layout.items[]` array with `{ sheetId, x, y, w, h }` — saved to `dashboards.layout` JSONB.

---

### 3.3 Chart Quality Issues

#### Hardcoded Data / Placeholders

✅ **No hardcoded data found in chart components.** All charts receive data via props from `processSheet()`.

✅ **Sample data files** in `frontend/public/samples/` are real CSV data:
- `sales-data.csv`: 25 rows, 8 columns (Date, Region, Product, Category, Revenue, Units Sold, Profit, Customer Segment)
- `ecommerce-data.csv`: 21 rows, 11 columns
- `hr-data.csv`: 21 rows, 10 columns

#### Field Name Matching

⚠️ **Validation exists but warnings are silent.** The backend validates field references:
```python
# generate.py:158-165
for key in ["columns", "rows", "color", "size", "label"]:
    binding = enc.get(key)
    if binding and isinstance(binding, dict):
        field = binding.get("field", "")
        if field and field not in column_names:
            warnings.append(f"Sheet {sid}: unknown field '{field}' in {key}")
```

The ChatPage also logs field mismatches:
```typescript
// ChatPage.tsx:133-144
const missing = sheetFields.filter(f => !dataColumns.has(f))
if (missing.length > 0) console.warn(`Sheet references missing fields: ${missing}`)
```

❌ **Neither warning is shown to the user.** If Claude hallucinates a field name, the chart silently renders empty.

#### Calculated Fields

✅ Calculated fields (e.g., profit margin) are computed correctly via the formula evaluator:
```typescript
// formulaEvaluator.ts:119-131
export function applyCalculatedFields(rows, fields) {
  return rows.map((row) => {
    const extended = { ...row }
    for (const field of fields) {
      extended[field.name] = evaluateFormula(field.formula, extended)
    }
    return extended
  })
}
```

⚠️ **Calculated fields are not persisted with the dashboard.** They're passed through the generation call but not stored in the `dashboards` table. On draft resume, calculated fields are lost.

#### Charts That Render Empty

⚠️ **Silent empty rendering scenarios:**
1. If a field name in the Sheet encoding doesn't exist in the data columns → chart renders with no bars/lines/points
2. If `markType: 'text'` (KPI) has no measures → shows `0`
3. If `markType: 'scatter'` has only 1 measure → both x and y use the same field → diagonal line

✅ **Error boundaries exist:** Each chart is wrapped in an `ErrorBoundary` (DashboardRenderer.tsx) that shows "Chart Error" + Retry button on crash.

✅ **Empty state handling:** `ChartWrapper` component shows editorial empty message ("No data" / "Add fields to visualise") when data is empty.

---

### 3.4 Data Pipeline Quality

**Aggregation engine** (`frontend/src/engine/aggregator.ts`):
- ✅ 6 aggregation types: `sum`, `avg`, `count`, `count_distinct`, `min`, `max`, `none`
- ✅ Groups by dimension values, aggregates measures per group
- ✅ Returns new arrays (no mutation)

**Filter system** (`frontend/src/engine/filters.ts`):
- ✅ 9 operators: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `in`, `contains`, `between`
- ✅ Auto-detects date/numeric types
- ✅ Helper functions: `getUniqueValues()`, `getValueRange()`, `createDateRangeFilter()`

**Formatters** (`frontend/src/engine/formatters.ts`):
- ✅ Compact numbers: `1.2M`, `536.7K`, `42B`
- ✅ Currency with prefix: `£536.7K`
- ✅ 8 date formats
- ✅ Conditional color: positive → green, negative → red
- ✅ `tabular-nums` and `font-mono` on all numbers

**Caching:** `processSheet()` results cached in LRU cache (50 entries max) keyed on `hash(data) + sheet config + formulas`.

⚠️ **`toNum()` currency stripping** (`replace(/[,$£€¥%]/g, '')`) could misparse fields containing these characters as data.

---

## SUMMARY OF ISSUES

### User Journey Issues

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Project name is the first 40 chars of chat message — produces meaningless names like "I want to create a cu..." | `Home.tsx:342-343` | **Major** |
| 2 | "Choose a data source" page shows massive empty space with no guidance or upload CTA | `ChatPage.tsx:172-177` | **Critical** |
| 3 | No way to upload data from ChatPage — dead end if no sources exist | `ChatPage.tsx:172-177` | **Critical** |
| 4 | Sample data cards hidden once user has any projects | `Home.tsx` (conditional render) | **Minor** |
| 5 | Going back from Editor to Chat loses dashboard context (columns, dataContext, chatMessages nulled) | `AppLayout.tsx:199-207` | **Major** |
| 6 | No navigation or feedback after publishing — modal stays open | `PublishModal.tsx` | **Major** |
| 7 | Published status not visible in sidebar, breadcrumbs, or project cards | `Sidebar.tsx`, `Header.tsx` | **Major** |
| 8 | Sidebar only shows data sources — no dashboard tree, no published links | `Sidebar.tsx` | **Major** |
| 9 | WorkflowStepper defined but never rendered | `WorkflowStepper.tsx` | **Minor** |
| 10 | ProjectsPage defined but not routed — unreachable | `ProjectsPage.tsx` | **Minor** |
| 11 | Sidebar doesn't auto-refresh when projects created during session | `Sidebar.tsx` | **Minor** |

### Functionality Issues

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Chat history not persisted — lost on page refresh | `useChat.ts` | **Critical** |
| 2 | No structured plan extraction from chat — generation is a blind text dump | `chat.py`, `generate.py` | **Major** |
| 3 | Generation warnings (field mismatches) never shown to user | `ChatPage.tsx:133`, `generate.py:221` | **Major** |
| 4 | No `projects` table — "project" is a frontend wrapper around `data_sources` | `ProjectContext.tsx` | **Major** |
| 5 | Entire data array stored in `dashboards.data` JSONB — scalability risk | `dashboard-storage.ts`, `create_dashboards.sql` | **Major** |
| 6 | Calculated fields not persisted with dashboard — lost on draft resume | `EditorPage.tsx` | **Major** |
| 7 | RLS policy is fully permissive (`USING (true)`) — no user-scoped access | `create_dashboards.sql:22-28` | **Critical** |
| 8 | Published dashboard data duplicated (not linked to draft) — edits don't propagate | `publish.py`, `published_dashboards.sql` | **Minor** |
| 9 | Three independent chat surfaces with separate state — inconsistent experience | `CaptainSidebar.tsx`, `CaptainFullPage.tsx`, `ChatPage.tsx` | **Minor** |
| 10 | Settings page is a "Coming soon" placeholder | `AppLayout.tsx:287-296` | **Minor** |

### Data Visualisation Issues

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Silent empty chart rendering when field names don't match CSV headers | `DashboardRenderer.tsx` | **Major** |
| 2 | Scatter plot with 1 measure renders diagonal line (no validation for 2 measures) | `DashboardRenderer.tsx` switch case | **Minor** |
| 3 | KPI `text` markType with no measures shows `0` instead of meaningful error | `DashboardRenderer.tsx` KPI case | **Minor** |
| 4 | `toNum()` currency stripping could misparse edge case data | `aggregator.ts` | **Minor** |
| 5 | Sort on non-existent field silently ignored — could hide config typos | `dataEngine.ts` | **Minor** |
| 6 | No `count_null` / `count_non_null` aggregation types | `aggregator.ts` | **Minor** |

### What Works Well

- ✅ Complete chart suite — 7 visualization types + KPI, all properly styled with IBM Plex + monochrome palette
- ✅ Robust data engine — 7-step pipeline (calc fields → filters → aggregate → flatten → sort → limit → render)
- ✅ Full dnd-kit integration — field drag-to-shelf, chart resize with grid snapping
- ✅ Streaming chat works end-to-end with proper error handling
- ✅ Publishing with access control (public/password/invite), branding, and embed support
- ✅ Formula parser supports complex expressions including IF, DATEDIFF, arithmetic
- ✅ processSheet() memoization with LRU cache (50 entries)
- ✅ Error boundaries on every chart — failures show UI fallback, not crashes
- ✅ Backend validation of generated dashboard specs (field references, mark types, layout)
- ✅ Auto-save in editor (debounced 2s)
- ✅ Editorial design system consistently applied (IBM Plex, monochrome, minimal borders)
