/**
 * utils/plan-to-dashboard.ts
 *
 * Converts a PlanDelta (from Captain's planning conversation)
 * into the dashboard format that DashboardRenderer expects.
 *
 * This is the bridge between planning and generation.
 * When the user clicks Generate, we don't need to call the AI —
 * the plan already has exact field names, aggregations, and formats.
 *
 * Drop this into src/utils/plan-to-dashboard.ts
 */

import type { PlanDelta, PlanKPI, PlanChart, PlanCalculatedField } from './plan-parser';

// ── Output types (matching what DashboardRenderer expects) ──────

export interface SheetEncoding {
  field: string;
  type: 'dimension' | 'measure';
  aggregation?: string;
  granularity?: string;
  format?: {
    type: string;
    prefix?: string;
    suffix?: string;
    decimals?: number;
  };
}

export interface SheetConfig {
  id: string;
  name: string;
  markType: string;
  dataSourceId: string;
  projectId: string;
  encoding: {
    columns?: SheetEncoding | null;
    rows?: SheetEncoding | null;
    color?: SheetEncoding | null;
  };
  config: {
    orientation?: string;
    sort?: { field: string; order: string } | null;
    limit?: number | null;
    stacked?: boolean;
    showLegend?: boolean;
  };
  filters: unknown[];
}

export interface DashboardFromPlan {
  name: string;
  sheets: SheetConfig[];
  calculatedFields: Array<{ name: string; formula: string; resultType?: string }>;
  layout: {
    columns: number;
    items: Array<{ sheetId: string; x: number; y: number; w: number; h: number }>;
  };
}

// ── KPI → Sheet ─────────────────────────────────────────────────

function kpiToSheet(kpi: PlanKPI): SheetConfig {
  return {
    id: kpi.id,
    name: kpi.name,
    markType: 'text',
    dataSourceId: '',
    projectId: '',
    encoding: {
      columns: null,
      rows: {
        field: kpi.field,
        type: 'measure',
        aggregation: kpi.aggregation || 'sum',
        format: kpi.format,
      },
      color: null,
    },
    config: {},
    filters: [],
  };
}

// ── Chart → Sheet ───────────────────────────────────────────────

function chartToSheet(chart: PlanChart): SheetConfig {
  const columns: SheetEncoding | null = chart.columns
    ? {
        field: chart.columns.field,
        type: 'dimension',
        granularity: chart.columns.granularity,
        format: chart.columns.format,
      }
    : null;

  const rows: SheetEncoding | null = chart.rows
    ? {
        field: chart.rows.field,
        type: 'measure',
        aggregation: chart.rows.aggregation || 'sum',
        format: chart.rows.format,
      }
    : null;

  const color: SheetEncoding | null = chart.color
    ? {
        field: chart.color.field,
        type: 'dimension',
      }
    : null;

  return {
    id: chart.id,
    name: chart.name,
    markType: chart.markType,
    dataSourceId: '',
    projectId: '',
    encoding: { columns, rows, color },
    config: {
      orientation: chart.config?.orientation,
      sort: chart.config?.sort || null,
      limit: chart.config?.limit || null,
      stacked: chart.config?.stacked || false,
      showLegend: !!color,
    },
    filters: [],
  };
}

// ── Layout builder ──────────────────────────────────────────────

function buildLayout(kpis: PlanKPI[], charts: PlanChart[]): DashboardFromPlan['layout'] {
  const items: Array<{ sheetId: string; x: number; y: number; w: number; h: number }> = [];

  // KPIs: row at y=0, evenly distributed across 12 columns
  const kpiW = kpis.length > 0 ? Math.floor(12 / Math.min(kpis.length, 4)) : 3;
  kpis.forEach((kpi, i) => {
    items.push({
      sheetId: kpi.id,
      x: (i % 4) * kpiW,
      y: 0,
      w: kpiW,
      h: 2,
    });
  });

  // Charts: stacked below KPIs
  let currentY = 2;
  const fullWidthTypes = new Set(['line', 'area', 'table']);

  for (let i = 0; i < charts.length; i++) {
    const chart = charts[i];
    const isFullWidth = fullWidthTypes.has(chart.markType);

    if (isFullWidth) {
      items.push({ sheetId: chart.id, x: 0, y: currentY, w: 12, h: 5 });
      currentY += 5;
    } else {
      // Try to pair with next chart
      const next = charts[i + 1];
      const nextIsFullWidth = next && fullWidthTypes.has(next.markType);

      if (next && !nextIsFullWidth) {
        // Side by side
        items.push({ sheetId: chart.id, x: 0, y: currentY, w: 6, h: 5 });
        items.push({ sheetId: next.id, x: 6, y: currentY, w: 6, h: 5 });
        currentY += 5;
        i++; // skip next since we placed it
      } else {
        // Single half-width (or next is full-width)
        items.push({ sheetId: chart.id, x: 0, y: currentY, w: 12, h: 5 });
        currentY += 5;
      }
    }
  }

  return { columns: 12, items };
}

// ── Main converter ──────────────────────────────────────────────

export function planToDashboard(plan: PlanDelta): DashboardFromPlan {
  const sheets: SheetConfig[] = [
    ...plan.kpis.map(kpiToSheet),
    ...plan.charts.map(chartToSheet),
  ];

  const calculatedFields = plan.calculatedFields.map(cf => ({
    name: cf.name,
    formula: cf.formula,
    resultType: cf.resultType,
  }));

  const layout = buildLayout(plan.kpis, plan.charts);

  return {
    name: plan.name || 'Dashboard',
    sheets,
    calculatedFields,
    layout,
  };
}
