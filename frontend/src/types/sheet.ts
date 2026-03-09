export interface FieldBinding {
  field: string
  type: 'dimension' | 'measure'
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none'
  format?: {
    type: 'number' | 'currency' | 'percent' | 'date' | 'string'
    decimals?: number
    prefix?: string
    suffix?: string
    dateFormat?: string
  }
}

export interface SheetFilter {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains'
  value: string | number | string[]
}

export interface Sheet {
  id: string
  projectId: string
  dataSourceId: string
  name: string
  markType: 'bar' | 'line' | 'area' | 'scatter' | 'pie' | 'text' | 'table'
  encoding: {
    columns?: FieldBinding
    rows?: FieldBinding
    color?: FieldBinding
    size?: FieldBinding
    label?: FieldBinding
    tooltip?: FieldBinding[]
    detail?: FieldBinding[]
  }
  config: {
    orientation?: 'vertical' | 'horizontal'
    stacked?: boolean
    showLegend?: boolean
    showLabels?: boolean
    smooth?: boolean
    sort?: { field: string; order: 'asc' | 'desc' }
    limit?: number
  }
  filters: SheetFilter[]
}

export interface DashboardLayoutItem {
  sheetId: string
  x: number
  y: number
  w: number
  h: number
}

export interface DashboardLayout {
  columns: number
  rowHeight: number
  items: DashboardLayoutItem[]
}
