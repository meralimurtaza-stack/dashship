import { useReducer, useCallback, useEffect, useRef, useMemo } from 'react'
import type { PlanSpec, PlanDelta, SheetSpec, CalcFieldSpec, BusinessRuleGroup } from '../types/plan-spec'
import { supabase } from '../lib/supabase'

interface FieldWarning {
  sheetId: string
  field: string
  message: string
}

interface PlanSpecState {
  spec: PlanSpec
  fieldWarnings: FieldWarning[]
}

function createEmptySpec(): PlanSpec {
  return {
    plan: { title: '', description: '' },
    dataProfile: { source: '', rows: 0, fields: [] },
    businessRules: [],
    calculatedFields: [],
    globalFilters: [],
    sheets: [],
    layout: { columns: 12, arrangement: [] },
  }
}

function validateFieldRef(fieldName: string, spec: PlanSpec): boolean {
  const inProfile = spec.dataProfile.fields.some(f => f.name === fieldName)
  const isCalc = spec.calculatedFields.some(f => f.name === fieldName)
  return inProfile || isCalc
}

function computeWarnings(spec: PlanSpec): FieldWarning[] {
  const warnings: FieldWarning[] = []
  for (const sheet of spec.sheets) {
    const checkField = (binding: { field: string } | undefined, label: string) => {
      if (binding && !validateFieldRef(binding.field, spec)) {
        warnings.push({ sheetId: sheet.id, field: binding.field, message: `${label} field "${binding.field}" not found in data profile` })
      }
    }
    checkField(sheet.x, 'x')
    checkField(sheet.y, 'y')
    checkField(sheet.color, 'color')
    if (sheet.columns) {
      for (const col of sheet.columns) {
        if (!validateFieldRef(col, spec)) {
          warnings.push({ sheetId: sheet.id, field: col, message: `Column "${col}" not found in data profile` })
        }
      }
    }
    if (sheet.metrics) {
      for (const m of sheet.metrics) {
        if (!validateFieldRef(m.field, spec)) {
          warnings.push({ sheetId: sheet.id, field: m.field, message: `Metric field "${m.field}" not found in data profile` })
        }
      }
    }
  }
  return warnings
}

function applyDeltaToSpec(spec: PlanSpec, delta: PlanDelta): PlanSpec {
  switch (delta.action) {
    case 'add_sheet':
      return { ...spec, sheets: [...spec.sheets, delta.sheet] }

    case 'update_sheet':
      return {
        ...spec,
        sheets: spec.sheets.map(s =>
          s.id === delta.id ? { ...s, ...delta.updates } as SheetSpec : s
        ),
      }

    case 'remove_sheet':
      return {
        ...spec,
        sheets: spec.sheets.filter(s => s.id !== delta.id),
        layout: {
          ...spec.layout,
          arrangement: spec.layout.arrangement.filter(a => a.sheetId !== delta.id),
        },
      }

    case 'add_calculated_field':
      return { ...spec, calculatedFields: [...spec.calculatedFields, delta.field] }

    case 'update_calculated_field':
      return {
        ...spec,
        calculatedFields: spec.calculatedFields.map(f =>
          f.name === delta.name ? { ...f, ...delta.updates } as CalcFieldSpec : f
        ),
      }

    case 'remove_calculated_field':
      return {
        ...spec,
        calculatedFields: spec.calculatedFields.filter(f => f.name !== delta.name),
      }

    case 'add_business_rule':
      return { ...spec, businessRules: [...spec.businessRules, delta.rule] }

    case 'update_business_rule':
      return {
        ...spec,
        businessRules: spec.businessRules.map(r =>
          r.name === delta.name ? { ...r, ...delta.updates } as BusinessRuleGroup : r
        ),
      }

    case 'add_global_filter':
      return { ...spec, globalFilters: [...spec.globalFilters, delta.filter] }

    case 'remove_global_filter':
      return {
        ...spec,
        globalFilters: spec.globalFilters.filter(f => f.field !== delta.field),
      }

    case 'set_plan_meta':
      return { ...spec, plan: { ...spec.plan, ...delta.meta } }

    case 'set_layout':
      return { ...spec, layout: delta.layout }

    default:
      return spec
  }
}

type SpecAction =
  | { type: 'apply_delta'; delta: PlanDelta }
  | { type: 'reset'; spec?: PlanSpec }

function specReducer(state: PlanSpecState, action: SpecAction): PlanSpecState {
  switch (action.type) {
    case 'apply_delta': {
      const newSpec = applyDeltaToSpec(state.spec, action.delta)
      return { spec: newSpec, fieldWarnings: computeWarnings(newSpec) }
    }
    case 'reset': {
      const newSpec = action.spec ?? createEmptySpec()
      return { spec: newSpec, fieldWarnings: computeWarnings(newSpec) }
    }
    default:
      return state
  }
}

export function usePlanSpec(dashboardId: string | null) {
  const [state, dispatch] = useReducer(specReducer, {
    spec: createEmptySpec(),
    fieldWarnings: [],
  })

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedRef = useRef(false)

  // Load spec from Supabase on mount
  useEffect(() => {
    if (!dashboardId) return
    loadedRef.current = false

    supabase
      .from('dashboards')
      .select('plan_spec')
      .eq('id', dashboardId)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.plan_spec) {
          dispatch({ type: 'reset', spec: data.plan_spec as PlanSpec })
        }
        loadedRef.current = true
      })
  }, [dashboardId])

  // Debounced save to Supabase on spec change
  useEffect(() => {
    if (!dashboardId || !loadedRef.current) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      supabase
        .from('dashboards')
        .update({ plan_spec: state.spec })
        .eq('id', dashboardId)
        .then(({ error }) => {
          if (error) console.error('Failed to save plan spec:', error)
        })
    }, 2000)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [dashboardId, state.spec])

  const applyDelta = useCallback((delta: PlanDelta) => {
    dispatch({ type: 'apply_delta', delta })
  }, [])

  const reset = useCallback((spec?: PlanSpec) => {
    dispatch({ type: 'reset', spec })
  }, [])

  const isValid = useMemo(() => {
    return state.spec.sheets.length > 0 && state.fieldWarnings.length === 0
  }, [state.spec.sheets.length, state.fieldWarnings.length])

  return {
    spec: state.spec,
    dispatch,
    applyDelta,
    fieldWarnings: state.fieldWarnings,
    isValid,
    reset,
  }
}
