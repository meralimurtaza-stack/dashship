import type { PlanSpec, SheetSpec } from '../types/plan-spec'

function mapChartType(chartType: string): string {
  if (chartType === 'kpi') return 'text'
  return chartType // bar, line, area, scatter, pie, table map 1:1
}

function buildEncoding(sheet: SheetSpec) {
  // For kpi type: use first metric's field
  if (sheet.chartType === 'kpi' && sheet.metrics?.length) {
    return {
      columns: null,
      rows: { field: sheet.metrics[0].field, type: 'measure', aggregation: sheet.metrics[0].aggregation || 'sum' },
      color: null, size: null, label: null, tooltip: [], detail: [],
    }
  }
  // For table type: columns become the visible fields
  if (sheet.chartType === 'table') {
    return {
      columns: sheet.columns?.map(c => ({ field: c, type: 'dimension', aggregation: 'none' })) || [],
      rows: null, color: null, size: null, label: null, tooltip: [], detail: [],
    }
  }
  // For standard charts:
  return {
    columns: sheet.x ? { field: sheet.x.field, type: sheet.x.type, aggregation: sheet.x.agg || 'none' } : null,
    rows: sheet.y ? { field: sheet.y.field, type: sheet.y.type, aggregation: sheet.y.agg || 'sum' } : null,
    color: sheet.color ? { field: sheet.color.field, type: sheet.color.type, aggregation: sheet.color.agg || 'none' } : null,
    size: null, label: null, tooltip: [], detail: [],
  }
}

function buildConfig(sheet: SheetSpec) {
  return {
    orientation: sheet.config?.orientation || 'vertical',
    stacked: sheet.config?.stacked || false,
    showLabels: sheet.config?.showLabels ?? true,
    showLegend: sheet.config?.showLegend ?? true,
    areaFill: sheet.config?.areaFill || false,
    curveType: sheet.config?.curveType || 'monotone',
    donut: sheet.config?.donut || false,
    sort: sheet.sort || null,
  }
}

export function specToDashboard(spec: PlanSpec) {
  return {
    name: spec.plan.title || 'Untitled dashboard',
    sheets: spec.sheets.map(sheet => ({
      id: sheet.id,
      name: sheet.intent,
      markType: mapChartType(sheet.chartType),
      encoding: buildEncoding(sheet),
      config: buildConfig(sheet),
      filters: sheet.filters || [],
      dataSourceId: null, // set by caller
      projectId: null,    // set by caller
    })),
    layout: {
      columns: spec.layout?.columns || 12,
      rowHeight: 60,
      items: (spec.layout?.arrangement || []).map(item => ({
        sheetId: item.sheetId,
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
      })),
    },
    calculatedFields: spec.calculatedFields.map(cf => ({
      name: cf.name,
      formula: cf.formula,
      type: cf.type,
    })),
  }
}
