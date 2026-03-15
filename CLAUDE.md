# DashShip
AI-powered dashboard builder where analytics consultants upload data, chat with Claude to plan analysis, get production-ready dashboards generated, refine with Tableau-style editing, and publish to secure hosted URLs.
## Stack
- Frontend: React 18 + Vite + TypeScript + Tailwind CSS v4
- Backend: FastAPI (Python)
- Database: Supabase (PostgreSQL + Auth + Storage)
- AI: Anthropic Claude API (claude-sonnet-4-5-20250929)
- Charts: Recharts
- Drag & Drop: dnd-kit
- Deployment: Supabase Edge Functions
## Commands
- `cd frontend && npm run dev` — start frontend dev server
- `cd frontend && npm run build` — production build
- `cd backend && uvicorn app.main:app --reload` — start backend
- `npm run test` — run tests
## Core Architecture: The Sheet Model
Every chart is an independent **Sheet** with its own field bindings, mark type, aggregation, filters, and sorting. Dashboards are grid layouts (12 columns) that position and size Sheet references. Sheets can be reused across dashboards. The AI generates Sheet configs as structured JSON, not monolithic dashboard objects.
## Key TypeScript Interfaces
```typescript
// Sheet — the core data structure
interface Sheet {
  id: string;
  projectId: string;
  dataSourceId: string;
  name: string;
  markType: 'bar' | 'line' | 'area' | 'scatter' | 'pie' | 'text' | 'table';
  encoding: {
    columns?: FieldBinding;
    rows?: FieldBinding;
    color?: FieldBinding;
    size?: FieldBinding;
    label?: FieldBinding;
    tooltip?: FieldBinding[];
    detail?: FieldBinding[];
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
  filters: SheetFilter[];
}
// FieldBinding — a field dragged onto a shelf
interface FieldBinding {
  field: string;
  type: 'dimension' | 'measure';
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';
  format?: {
    type: 'number' | 'currency' | 'percent' | 'date' | 'string';
    decimals?: number;
    prefix?: string;
    suffix?: string;
    dateFormat?: string;
  };
}
// DashboardLayout — grid layout of sheet references
interface DashboardLayout {
  columns: number; // default 12
  rowHeight: number; // default 60px
  items: Array<{
    sheetId: string;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
}
```
## Design System — "The Broadsheet Terminal"
Two design systems coexist: the DashShip app (warm cream, IBM Plex Mono headlines, zero radius) and published dashboards (white, system sans-serif, rounded corners).

### App Colours (--ds-* tokens)
- **Page background**: #ECEAE4 (`bg-ds-bg`) — warm cream canvas
- **Surface**: #FAFAF6 (`bg-ds-surface`) — cards, panels
- **Surface alt**: #F4F2EC (`bg-ds-surface-alt`) — hover, alternating rows
- **Primary text**: #141210 (`text-ds-text`)
- **Secondary text**: #6D6860 (`text-ds-text-muted`)
- **Dim text**: #A19D94 (`text-ds-text-dim`) — placeholders, hints
- **Accent**: #1C3360 (`bg-ds-accent`) — deep ink-blue, CTAs, active states, logo
- **Accent hover**: #152A50 (`bg-ds-accent-hover`)
- **Success**: #2E7D5B (`text-ds-success`) — positive deltas, LIVE badges
- **Warning**: #B8860B (`text-ds-warning`)
- **Error**: #C1403D (`text-ds-error`) — errors, destructive
- **Borders**: #D7D3C9 (`border-ds-border`), #C7C2B5 (`border-ds-border-strong`)
- **Gold**: #C8963E (`text-ds-gold`) — highlight accent, used sparingly

### Chart Colours (4-colour Economist-grade)
- #1C3360 (ink-blue), #141210 (near-black), #8D8981 (warm grey), #C8963E (gold)

### Published Dashboard Colours (--pub-* tokens)
- White bg, system sans-serif, rounded corners (6px), subtle shadows OK
- #FFFFFF, #FAFAFA, #1A1A1A, #888888, #BBBBBB, #EDEDEB

### Typography
- **IBM Plex Mono**: headings, nav items, labels, data values, buttons, logo "DashShip_", input placeholders
- **IBM Plex Sans**: body text, descriptions, chat messages, sidebar project names, form values
- Weight: 400 (regular) default, 500 (medium) for headings/active nav/buttons. NEVER 600/700.
- **Published dashboards**: system sans-serif only, no IBM Plex Mono

### Components
- **Cards**: bg-ds-surface, 1px solid border-ds-border, zero border-radius, no shadows
- **Buttons primary**: bg-ds-accent text-white font-mono text-xs tracking-wider, zero radius
- **Buttons secondary**: border border-ds-border-strong text-ds-text, zero radius
- **Micro-labels** (the DashShip fingerprint): `.micro-label` class — Plex Mono 9px uppercase tracking 0.08em, text-ds-text-dim
- **Navigation tabs**: underline style (not pills), active = font-medium + 2.5px bottom border in ds-accent
- **Inputs**: border-ds-border-strong, zero radius, focus border = ds-accent, no ring
- **Logo**: ink-blue square (22x22, zero radius) with white "D" + "DashShip_" in Plex Mono medium

### What NOT to use
- No teal (#2A9D8F), no indigo, no bright gradients
- No `rounded-*` on cards/containers/panels (zero radius in the app)
- No `shadow-*` on cards
- No glassmorphic effects (no backdrop-blur)
- No Inter font
- No bold (600/700) weights
## Code Conventions
- Functional components with hooks only, no class components
- All styling via Tailwind CSS utility classes, no inline styles or CSS modules
- Files under 300 lines — refactor if exceeded
- Each component in its own file
- Custom hooks for data fetching and state management
- Proper TypeScript types for all props and state
## Frontend Aesthetics
"The Broadsheet Terminal" — editorial authority delivered through monospace precision. The app feels like a premium financial terminal built by someone who writes SQL for a living. Warm cream canvas (#ECEAE4), ink-blue accent (#1C3360), IBM Plex Mono headlines, zero border-radius on cards. No Inter font, no teal, no indigo, no purple, no bright gradients, no glassmorphic effects, no box shadows. Use Tailwind v4 `@theme` CSS variables with `--color-ds-*` tokens. Published dashboards use a separate clean system-sans design with `--color-pub-*` tokens.
## Context7 Rule
Always use Context7 MCP for library/API documentation when generating code that uses dnd-kit, Recharts, Supabase, Papa Parse, or any external library, without being asked.
## Agent Team Configuration
When working with agent teams:
- **Frontend Agent**: Owns /frontend/src/components/. Uses design system tokens. Follows Tailwind v4 + IBM Plex conventions.
- **Engine Agent**: Owns /frontend/src/engine/. Pure TypeScript, no UI. Data aggregation, formula parsing, formatters.
- **Backend Agent**: Owns /backend/. FastAPI routes, Claude API integration, prompt engineering.
- **Test Agent**: Writes tests. Covers edge cases. Validates UI rendering.
## AI Dashboard Generation (json-render)
DashShip uses @json-render/core and @json-render/react from Vercel Labs for guardrailed AI-to-UI generation. When Claude generates a dashboard, it outputs JSON constrained to a catalog of allowed components — never raw React code.

### How it works
1. We define a catalog of allowed components (KPICard, BarChart, LineChart, DataTable, FilterControl) with Zod schemas
2. Claude API generates JSON specs referencing only catalog components
3. The Renderer component turns JSON into React components safely and predictably
4. Output streams progressively as JSON arrives from Claude

### Key packages
- @json-render/core — catalog definition, validation, spec streaming
- @json-render/react — React renderer, defineRegistry, useUIStream hook
- @json-render/shadcn — pre-built shadcn/ui component definitions (optional)

### Pattern
```typescript
const catalog = defineCatalog(schema, {
  components: {
    KPICard: { props: z.object({ label: z.string(), value: z.string(), trend: z.number().optional() }) },
    BarChart: { props: z.object({ encoding: SheetEncodingSchema }) },
  },
  actions: {}
});

const { registry } = defineRegistry(catalog, {
  components: { KPICard: DashShipKPICard, BarChart: DashShipBarChart }
});

<Renderer spec={spec} registry={registry} />
```

This ensures Claude can only generate dashboards using components we have built and tested. No broken UI, no hallucinated components.
