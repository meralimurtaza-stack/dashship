export interface PlanMeta {
  title: string
  description: string
  audience?: string
}

export interface BusinessRule {
  status: string
  condition: string
  action: string
}

export interface BusinessRuleGroup {
  name: string
  rules: BusinessRule[]
}

export interface CalcFieldSpec {
  name: string
  formula: string
  type: 'measure' | 'dimension'
  lod?: boolean
  grain?: string
  dependsOn: string[]
}

export interface FieldBinding {
  field: string
  type: 'dimension' | 'measure'
  agg?: 'sum' | 'avg' | 'count' | 'count_distinct' | 'min' | 'max' | 'none'
  filter?: string
}

export interface SheetSpec {
  id: string
  intent: string
  chartType: 'bar' | 'line' | 'area' | 'scatter' | 'pie' | 'kpi' | 'table'
  x?: FieldBinding
  y?: FieldBinding
  color?: FieldBinding
  columns?: string[]  // for table type
  metrics?: Array<{ label: string; field: string; aggregation?: string; filter?: string; format?: string }>  // for kpi type
  filters?: Array<{ field: string; operator: string; values: string[] }>
  sort?: { field: string; direction: 'asc' | 'desc' }
  config?: Record<string, any>
}

export interface LayoutItem {
  sheetId: string
  x: number
  y: number
  w: number
  h: number
}

export interface PlanSpec {
  plan: PlanMeta
  dataProfile: {
    source: string
    rows: number
    fields: Array<{ name: string; type: string; cardinality?: number; subtype?: string }>
  }
  businessRules: BusinessRuleGroup[]
  calculatedFields: CalcFieldSpec[]
  globalFilters: Array<{ field: string; type: string }>
  sheets: SheetSpec[]
  layout: {
    columns: number
    arrangement: LayoutItem[]
  }
}

export type PlanDeltaAction =
  | { action: 'add_sheet'; sheet: SheetSpec }
  | { action: 'update_sheet'; id: string; updates: Partial<SheetSpec> }
  | { action: 'remove_sheet'; id: string }
  | { action: 'add_calculated_field'; field: CalcFieldSpec }
  | { action: 'update_calculated_field'; name: string; updates: Partial<CalcFieldSpec> }
  | { action: 'remove_calculated_field'; name: string }
  | { action: 'add_business_rule'; rule: BusinessRuleGroup }
  | { action: 'update_business_rule'; name: string; updates: Partial<BusinessRuleGroup> }
  | { action: 'add_global_filter'; filter: { field: string; type: string } }
  | { action: 'remove_global_filter'; field: string }
  | { action: 'set_plan_meta'; meta: Partial<PlanMeta> }
  | { action: 'set_layout'; layout: { columns: number; arrangement: LayoutItem[] } }

export type PlanDelta = PlanDeltaAction
