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
- **Typography**: IBM Plex Sans (UI text), IBM Plex Mono (code/numbers)
- **Primary colour**: Indigo-600 (#4F46E5)
- **Cards**: Glassmorphic styling with subtle backdrop blur and border opacity
- **Spacing**: 4px base scale (4, 8, 12, 16, 24, 32, 48)
- **Aesthetic**: Apple-inspired, clean, premium feel
- **Numbers**: Always use tabular number formatting
- **Formatting**: £536.7K not £536700, conditional colouring (red low, green high)
- **Loading**: Skeleton screens, never spinners
- **Empty states**: Helpful illustrations with clear CTAs
## Code Conventions
- Functional components with hooks only, no class components
- All styling via Tailwind CSS utility classes, no inline styles or CSS modules
- Files under 300 lines — refactor if exceeded
- Each component in its own file
- Custom hooks for data fetching and state management
- Proper TypeScript types for all props and state
## Frontend Aesthetics
Avoid generic AI-generated design. No Inter, Roboto, or system fonts. No purple gradients on white. Commit to the indigo + glassmorphic aesthetic with IBM Plex typography. Every component should feel intentionally designed, not template-generated. Use CSS variables for colour consistency. Dominant colours with sharp accents, not timid evenly-distributed palettes.
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
