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
## Design System
- **Typography**: IBM Plex Sans (body), IBM Plex Mono (headlines, labels, numbers, data)
- **Labels**: font-mono, text-[10px] or text-xs, uppercase, tracking-widest
- **Page background**: #FAFAF8 (warm off-white, `bg-page`)
- **Cards**: bg-white, 1px solid border-gray-200, NO border-radius (or 2px max), no shadows (0 1px 3px rgba(0,0,0,0.04) max)
- **Primary text**: #0E0D0D (`text-ink`)
- **Secondary text**: gray-400 to gray-500
- **Accent**: #2A9D8F (muted teal) — use SPARINGLY, only for primary CTAs and active states
- **Buttons primary**: bg-gray-900 text-white, font-mono text-xs uppercase tracking-wide, px-6 py-3, no border-radius or 2px max
- **Buttons secondary**: border border-gray-900 text-gray-900, hover:bg-gray-900 hover:text-white
- **Navigation**: pill-style (bg-gray-100 rounded-full p-1, active: bg-gray-900 text-white rounded-full)
- **Numbers**: Always tabular-nums, font-mono
- **Formatting**: £536.7K not £536700, conditional colouring (red low, green high)
- **Loading**: Skeleton screens, never spinners
- **Empty states**: Editorial, generous whitespace, large monospace text
- **Aesthetic**: Editorial, typewriter-inspired, black/white with purposeful whitespace. Inspired by midday.ai / Fictional Spaces. No indigo, no purple, no bright colours.
## Code Conventions
- Functional components with hooks only, no class components
- All styling via Tailwind CSS utility classes, no inline styles or CSS modules
- Files under 300 lines — refactor if exceeded
- Each component in its own file
- Custom hooks for data fetching and state management
- Proper TypeScript types for all props and state
## Frontend Aesthetics
Avoid generic AI-generated design. No Inter, Roboto, or system fonts. No purple, no indigo, no bright gradients. Commit to the editorial black/white/teal aesthetic with IBM Plex typography. Every component should feel deliberately designed — typewriter-inspired, not template-generated. Use Tailwind v4 `@theme` CSS variables for colour consistency. Black on warm white with the muted teal accent used sparingly for active states and primary CTAs only.
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
