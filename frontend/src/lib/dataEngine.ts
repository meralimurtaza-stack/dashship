/**
 * dataEngine.ts — Data processing pipeline for DashShip chart rendering
 *
 * One function: processSheetData(sheet, rows, calculatedFields?)
 *
 * Pipeline:
 *   raw rows → calculated fields → filters → group by dimension →
 *   aggregate measures → color split → sort → limit
 *
 * No external dependencies beyond project types.
 */

import type { Sheet, SheetFilter, FieldBinding } from '../types/sheet'
import type { ColumnSchema } from '../types/datasource'

// ─── Types ──────────────────────────────────────────────────────

type DataRow = Record<string, unknown>

export interface CalculatedFieldDef {
  name: string
  formula: string
}

export interface ProcessResult {
  data: DataRow[]
  summary: {
    total: number
    aggregated: number
  }
  warnings?: string[]
}

type DateGranularity = 'monthly' | 'quarterly' | 'yearly'

type AggFn = 'sum' | 'avg' | 'count' | 'count_distinct' | 'min' | 'max' | 'none'

// ─── Date Helpers ───────────────────────────────────────────────

/**
 * Parse date strings flexibly. Handles:
 *   "2017-01-15", "01/15/2017", "15/01/2017", "Jan 15, 2017",
 *   ISO strings, and timestamps.
 *
 * Returns null if unparseable.
 */
export function tryParseDate(value: unknown): Date | null {
  if (value == null) return null
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value

  const str = String(value).trim()
  if (!str) return null

  // ISO / standard: "2017-01-15" or "2017-01-15T..."
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoMatch) {
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  }

  // US format: "MM/DD/YYYY" or "M/D/YYYY"
  const usMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usMatch) {
    const [, m, d, y] = usMatch
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return isNaN(date.getTime()) ? null : date
  }

  // UK format: "DD-MM-YYYY" with dashes
  const ukMatch = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/)
  if (ukMatch) {
    const [, d, m, y] = ukMatch
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return isNaN(date.getTime()) ? null : date
  }

  // Fallback: let Date.parse try
  const fallback = new Date(str)
  return isNaN(fallback.getTime()) ? null : fallback
}

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * Truncate a date to a label for grouping.
 *
 *   truncateDate(new Date("2017-03-15"), "monthly")    → "Mar 2017"
 *   truncateDate(new Date("2017-03-15"), "quarterly")  → "Q1 2017"
 *   truncateDate(new Date("2017-03-15"), "yearly")     → "2017"
 */
export function truncateDate(date: Date, granularity: DateGranularity): string {
  const year = date.getFullYear()
  const month = date.getMonth()

  switch (granularity) {
    case 'monthly':
      return `${MONTH_SHORT[month]} ${year}`
    case 'quarterly':
      return `Q${Math.floor(month / 3) + 1} ${year}`
    case 'yearly':
      return String(year)
  }
}

/**
 * Returns a sortable numeric key for a date label so chronological
 * ordering works (instead of alphabetical).
 */
function dateLabelSortKey(label: string): number {
  // "Mar 2017" → 201703, "Q1 2017" → 201701, "2017" → 201700
  const monthMatch = label.match(/^(\w{3}) (\d{4})$/)
  if (monthMatch) {
    const mi = MONTH_SHORT.indexOf(monthMatch[1])
    return Number(monthMatch[2]) * 100 + (mi >= 0 ? mi + 1 : 0)
  }
  const qMatch = label.match(/^Q(\d) (\d{4})$/)
  if (qMatch) {
    return Number(qMatch[2]) * 100 + (Number(qMatch[1]) - 1) * 3 + 1
  }
  const yearMatch = label.match(/^(\d{4})$/)
  if (yearMatch) {
    return Number(yearMatch[1]) * 100
  }
  return 0
}

// ─── Safe Formula Evaluator ─────────────────────────────────────

/**
 * Evaluate simple arithmetic expressions on row fields.
 * Supports: +, -, *, /, parentheses, and [Field Name] references.
 * NO eval(). Uses a simple recursive-descent parser.
 *
 *   evaluate("[Profit] / [Sales] * 100", { Profit: 50, Sales: 200 }) → 25
 */
function evaluateFormula(formula: string, row: DataRow): number | null {
  // Replace [Field Name] references with their numeric values
  let expr = formula
  const fieldPattern = /\[([^\]]+)\]/g
  let match: RegExpExecArray | null

  while ((match = fieldPattern.exec(formula)) !== null) {
    const fieldName = match[1]
    const val = Number(row[fieldName])
    if (isNaN(val)) return null
    // Replace all occurrences of this field reference
    expr = expr.replaceAll(match[0], String(val))
  }

  // Parse and evaluate the arithmetic expression
  try {
    return parseExpression(expr.trim())
  } catch {
    return null
  }
}

// Simple recursive-descent arithmetic parser: handles +, -, *, /, ()
function parseExpression(expr: string): number {
  let pos = 0

  function skipWhitespace() {
    while (pos < expr.length && expr[pos] === ' ') pos++
  }

  function parseNumber(): number {
    skipWhitespace()
    if (expr[pos] === '(') {
      pos++ // skip '('
      const val = parseAddSub()
      skipWhitespace()
      if (expr[pos] === ')') pos++ // skip ')'
      return val
    }

    // Handle unary minus
    let negative = false
    if (expr[pos] === '-') {
      negative = true
      pos++
    }

    const start = pos
    while (pos < expr.length && (expr[pos] >= '0' && expr[pos] <= '9' || expr[pos] === '.')) {
      pos++
    }
    if (pos === start) throw new Error('Expected number')
    const num = parseFloat(expr.substring(start, pos))
    return negative ? -num : num
  }

  function parseMulDiv(): number {
    let left = parseNumber()
    skipWhitespace()
    while (pos < expr.length && (expr[pos] === '*' || expr[pos] === '/')) {
      const op = expr[pos]
      pos++
      const right = parseNumber()
      left = op === '*' ? left * right : right !== 0 ? left / right : 0
      skipWhitespace()
    }
    return left
  }

  function parseAddSub(): number {
    let left = parseMulDiv()
    skipWhitespace()
    while (pos < expr.length && (expr[pos] === '+' || expr[pos] === '-')) {
      const op = expr[pos]
      pos++
      const right = parseMulDiv()
      left = op === '+' ? left + right : left - right
      skipWhitespace()
    }
    return left
  }

  return parseAddSub()
}

// ─── Pipeline Steps ─────────────────────────────────────────────

/** Step 1: Compute calculated fields and append as new columns */
function applyCalculatedFields(
  rows: DataRow[],
  fields: CalculatedFieldDef[]
): DataRow[] {
  if (fields.length === 0) return rows

  for (const f of fields) {
    console.log(`[dataEngine] Evaluating calc field: "${f.name}" with formula: "${f.formula}"`)
    if (rows.length > 0) {
      // Log a sample row BEFORE calc field is applied
      const sample = rows[0]
      const fieldRefs = [...f.formula.matchAll(/\[([^\]]+)\]/g)].map(m => m[1])
      const sampleBefore: Record<string, unknown> = {}
      for (const ref of fieldRefs) sampleBefore[ref] = sample[ref]
      console.log(`[dataEngine] Sample row before:`, sampleBefore)
    }
  }

  const counters = new Map<string, { success: number; fail: number }>()
  for (const f of fields) counters.set(f.name, { success: 0, fail: 0 })

  const result = rows.map(row => {
    const newRow = { ...row }
    for (const f of fields) {
      const val = evaluateFormula(f.formula, newRow)
      const counter = counters.get(f.name)!
      if (val !== null) {
        newRow[f.name] = val
        counter.success++
      } else {
        counter.fail++
      }
    }
    return newRow
  })

  for (const f of fields) {
    const counter = counters.get(f.name)!
    console.log(`[dataEngine] Calc field "${f.name}": ${counter.success} rows computed, ${counter.fail} rows failed`)
    if (result.length > 0 && result[0][f.name] !== undefined) {
      const sample = result[0]
      const fieldRefs = [...f.formula.matchAll(/\[([^\]]+)\]/g)].map(m => m[1])
      const sampleAfter: Record<string, unknown> = {}
      for (const ref of fieldRefs) sampleAfter[ref] = sample[ref]
      sampleAfter[f.name] = sample[f.name]
      console.log(`[dataEngine] Sample row after:`, sampleAfter)
    }
  }

  return result
}

/** Step 2: Apply sheet filters */
function applyFilters(rows: DataRow[], filters: SheetFilter[]): DataRow[] {
  if (filters.length === 0) return rows

  return rows.filter(row => {
    return filters.every(f => {
      const raw = row[f.field]
      const val = typeof raw === 'number' ? raw : Number(raw)
      const strVal = String(raw ?? '')

      switch (f.operator) {
        case 'eq':
        case 'contains': // treat 'contains' as equality for simple case
          return strVal === String(f.value)
        case 'neq':
          return strVal !== String(f.value)
        case 'gt':
          return !isNaN(val) && val > Number(f.value)
        case 'gte':
          return !isNaN(val) && val >= Number(f.value)
        case 'lt':
          return !isNaN(val) && val < Number(f.value)
        case 'lte':
          return !isNaN(val) && val <= Number(f.value)
        case 'in': {
          const allowed = Array.isArray(f.value) ? f.value : [f.value]
          return allowed.map(String).includes(strVal)
        }
        case 'between': {
          if (!Array.isArray(f.value) || f.value.length < 2) return true
          return !isNaN(val) && val >= Number(f.value[0]) && val <= Number(f.value[1])
        }
        default:
          return true
      }
    })
  })
}

/** Coerce a row value to a numeric */
function toNum(val: unknown): number {
  if (typeof val === 'number') return val
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

/** Aggregate an array of numeric values */
function aggregateValues(values: unknown[], agg: AggFn): number {
  const nums = values.map(toNum)

  switch (agg) {
    case 'sum':
      return nums.reduce((a, b) => a + b, 0)
    case 'avg':
      return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
    case 'count':
      return values.length
    case 'count_distinct':
      return new Set(values.map(String)).size
    case 'min':
      return nums.length > 0 ? Math.min(...nums) : 0
    case 'max':
      return nums.length > 0 ? Math.max(...nums) : 0
    case 'none':
      return nums.length > 0 ? nums[0] : 0
    default:
      return nums.reduce((a, b) => a + b, 0)
  }
}

// ─── Dimension key builder ──────────────────────────────────────

interface DimensionConfig {
  field: string
  isDate: boolean
  granularity?: DateGranularity
}

function buildDimKey(row: DataRow, dim: DimensionConfig): string {
  const raw = row[dim.field]
  if (raw == null) return '(empty)'

  if (dim.isDate && dim.granularity) {
    const d = tryParseDate(raw)
    if (d) return truncateDate(d, dim.granularity)
  }

  return String(raw)
}

// ─── Field Validation ───────────────────────────────────────────

/**
 * Check that every field referenced by a sheet actually exists in the data
 * (either as a raw column or a calculated field). Returns warnings for
 * missing fields so the renderer can show a helpful message instead of
 * silently producing zeros.
 */
/** Fuzzy match: normalize to lowercase, strip underscores/spaces/hyphens */
function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[_\s-]/g, '')
}

function findClosestField(target: string, available: Set<string>): string | null {
  const norm = normalizeFieldName(target)
  for (const f of available) {
    if (normalizeFieldName(f) === norm) return f
  }
  return null
}

function validateSheetFields(
  sheet: Sheet,
  availableFields: Set<string>,
  calcFieldNames: Set<string>,
  _columns?: ColumnSchema[]
): string[] {
  const warnings: string[] = []
  const allFields = new Set([...availableFields, ...calcFieldNames])

  const bindings: Array<{ label: string; field: string | undefined }> = [
    { label: 'columns', field: sheet.encoding.columns?.field },
    { label: 'rows', field: sheet.encoding.rows?.field },
    { label: 'color', field: sheet.encoding.color?.field },
    { label: 'size', field: sheet.encoding.size?.field },
  ]

  for (const b of bindings) {
    if (b.field && !allFields.has(b.field)) {
      const closest = findClosestField(b.field, allFields)
      let msg = `Field "${b.field}" (${b.label}) not found in data.`
      if (closest) {
        msg += ` Did you mean "${closest}"?`
      } else if (calcFieldNames.size === 0 && b.field.match(/margin|ratio|rate|percent|calc/i)) {
        msg += ' This looks like a calculated field — was it approved during planning?'
      }
      warnings.push(msg)
    }
  }

  return warnings
}

// ─── Main Pipeline ──────────────────────────────────────────────

/**
 * Process a Sheet's data through the full pipeline.
 *
 * Steps: validate fields → calc fields → filter → group → aggregate → color split → sort → limit
 */
export function processSheetData(
  sheet: Sheet,
  rows: DataRow[],
  calculatedFields?: CalculatedFieldDef[],
  columns?: ColumnSchema[]
): ProcessResult {
  const totalRows = rows.length
  const calcFields = calculatedFields ?? []

  // Step 0: Validate that referenced fields exist
  const rawFieldNames = rows.length > 0 ? new Set(Object.keys(rows[0])) : new Set<string>()
  const calcFieldNames = new Set(calcFields.map(cf => cf.name))
  const fieldWarnings = validateSheetFields(sheet, rawFieldNames, calcFieldNames, columns)

  if (fieldWarnings.length > 0) {
    for (const w of fieldWarnings) {
      console.warn(`[dataEngine] ${sheet.name}: ${w}`)
    }
  }

  // Helper: attach warnings to any result returned below
  const withWarnings = (result: ProcessResult): ProcessResult =>
    fieldWarnings.length > 0 ? { ...result, warnings: fieldWarnings } : result

  // Step 1: Calculated fields
  let data = applyCalculatedFields(rows, calcFields)

  // Step 2: Filters
  data = applyFilters(data, sheet.filters)

  // ── KPI shortcut (markType 'text' or 'kpi') ──────────────────
  // No grouping needed — aggregate the measure across all rows
  if (sheet.markType === 'text') {
    const measureBinding = sheet.encoding.rows
    if (!measureBinding) {
      return withWarnings({ data: [{ value: data.length }], summary: { total: totalRows, aggregated: 1 } })
    }
    const agg = (measureBinding.aggregation ?? 'sum') as AggFn
    const values = data.map(r => r[measureBinding.field])
    const result = aggregateValues(values, agg)
    return withWarnings({
      data: [{ value: result, [measureBinding.field]: result }],
      summary: { total: totalRows, aggregated: 1 },
    })
  }

  // ── Chart processing ──────────────────────────────────────────

  const dimBinding = sheet.encoding.columns
  const measureBinding = sheet.encoding.rows
  // For pie charts, color encoding is redundant (the dimension IS the color).
  // Including it triggers the color-split code path which breaks pie data:
  // each dimension row only has its own color key populated, others are 0.
  const colorBinding = sheet.markType === 'pie' ? undefined : sheet.encoding.color

  // Debug: log pie chart processing
  if (sheet.markType === 'pie') {
    console.log(`[dataEngine] Pie chart "${sheet.name}":`, {
      dimField: dimBinding?.field,
      measureField: measureBinding?.field,
      measureAgg: measureBinding?.aggregation,
      colorField: sheet.encoding.color?.field,
      colorStripped: !!sheet.encoding.color,
      sampleRows: data.slice(0, 5).map(r => ({
        [dimBinding?.field ?? '?']: r[dimBinding?.field ?? ''],
        [measureBinding?.field ?? '?']: r[measureBinding?.field ?? ''],
      })),
    })
  }

  // If no dimension or measure, return raw data (table case)
  if (!dimBinding && !measureBinding) {
    return withWarnings({ data, summary: { total: totalRows, aggregated: data.length } })
  }

  // If no dimension but has measure (e.g. single aggregate), treat like KPI
  if (!dimBinding && measureBinding) {
    const agg = (measureBinding.aggregation ?? 'sum') as AggFn
    const values = data.map(r => r[measureBinding.field])
    const result = aggregateValues(values, agg)
    return withWarnings({
      data: [{ [measureBinding.field]: result }],
      summary: { total: totalRows, aggregated: 1 },
    })
  }

  // Dimension config
  const dimField = dimBinding!.field
  const isDateDim = dimBinding!.format?.type === 'date'
    || data.some(r => tryParseDate(r[dimField]) !== null)
  const granularity = (dimBinding as any)?.granularity as DateGranularity | undefined
  const dimConfig: DimensionConfig = { field: dimField, isDate: isDateDim, granularity }

  // Measure config
  const measureField = measureBinding?.field
  const measureAgg: AggFn = (measureBinding?.aggregation ?? 'sum') as AggFn

  // Additional measure bindings (tooltip, size, label)
  const extraMeasures: Array<{ field: string; agg: AggFn }> = []
  if (sheet.encoding.size?.type === 'measure') {
    extraMeasures.push({
      field: sheet.encoding.size.field,
      agg: (sheet.encoding.size.aggregation ?? 'sum') as AggFn,
    })
  }
  if (sheet.encoding.tooltip) {
    for (const t of sheet.encoding.tooltip) {
      if (t.type === 'measure') {
        extraMeasures.push({ field: t.field, agg: (t.aggregation ?? 'sum') as AggFn })
      }
    }
  }

  // Step 3 + 4 + 5: Group → Aggregate → Color split

  if (colorBinding) {
    // ── With color split ────────────────────────────────────────
    // Group by (dimension, color) → produces stacked/grouped series
    const colorField = colorBinding.field
    const groups = new Map<string, Map<string, DataRow[]>>()

    for (const row of data) {
      const dimKey = buildDimKey(row, dimConfig)
      const colorKey = String(row[colorField] ?? '(empty)')

      if (!groups.has(dimKey)) groups.set(dimKey, new Map())
      const colorMap = groups.get(dimKey)!
      if (!colorMap.has(colorKey)) colorMap.set(colorKey, [])
      colorMap.get(colorKey)!.push(row)
    }

    // Collect all unique color values
    const colorValues = new Set<string>()
    for (const colorMap of groups.values()) {
      for (const key of colorMap.keys()) colorValues.add(key)
    }

    // Build output: one row per dimension, with a column per color value
    const result: DataRow[] = []
    for (const [dimKey, colorMap] of groups) {
      const outRow: DataRow = { [dimField]: dimKey }

      for (const colorVal of colorValues) {
        const groupRows = colorMap.get(colorVal) ?? []
        if (measureField) {
          const values = groupRows.map(r => r[measureField])
          outRow[colorVal] = aggregateValues(values, measureAgg)
        } else {
          outRow[colorVal] = groupRows.length
        }
      }

      // Extra measures (aggregated across all color groups for this dim)
      const allRows: DataRow[] = []
      for (const rows of colorMap.values()) allRows.push(...rows)
      for (const em of extraMeasures) {
        outRow[em.field] = aggregateValues(allRows.map(r => r[em.field]), em.agg)
      }

      result.push(outRow)
    }

    // Sort + limit
    const sorted = sortData(result, sheet, dimConfig, dimField)
    const limited = sheet.config.limit ? sorted.slice(0, sheet.config.limit) : sorted

    return withWarnings({ data: limited, summary: { total: totalRows, aggregated: limited.length } })
  }

  // ── Without color split ─────────────────────────────────────
  const groups = new Map<string, DataRow[]>()
  for (const row of data) {
    const dimKey = buildDimKey(row, dimConfig)
    if (!groups.has(dimKey)) groups.set(dimKey, [])
    groups.get(dimKey)!.push(row)
  }

  const result: DataRow[] = []
  for (const [dimKey, groupRows] of groups) {
    const outRow: DataRow = { [dimField]: dimKey }

    if (measureField) {
      const values = groupRows.map(r => r[measureField])
      outRow[measureField] = aggregateValues(values, measureAgg)
    }

    for (const em of extraMeasures) {
      outRow[em.field] = aggregateValues(groupRows.map(r => r[em.field]), em.agg)
    }

    result.push(outRow)
  }

  // Debug: log grouped results for pie charts
  if (sheet.markType === 'pie') {
    console.log(`[dataEngine] Pie groups (${result.length}):`, result.map(r => ({
      dim: r[dimField],
      value: measureField ? r[measureField] : 'n/a',
    })))
  }

  // Step 6 + 7: Sort → Limit
  const sorted = sortData(result, sheet, dimConfig, dimField)
  const limited = sheet.config.limit ? sorted.slice(0, sheet.config.limit) : sorted

  return withWarnings({ data: limited, summary: { total: totalRows, aggregated: limited.length } })
}

// ─── Sort Helper ────────────────────────────────────────────────

function sortData(
  data: DataRow[],
  sheet: Sheet,
  dimConfig: DimensionConfig,
  dimField: string
): DataRow[] {
  if (data.length === 0) return data

  const sortConfig = sheet.config.sort

  if (sortConfig) {
    const { field, order } = sortConfig
    const mult = order === 'desc' ? -1 : 1

    return [...data].sort((a, b) => {
      const av = a[field]
      const bv = b[field]
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * mult
      }
      return String(av ?? '').localeCompare(String(bv ?? '')) * mult
    })
  }

  // Default sort: chronological for dates, alphabetical for strings
  if (dimConfig.isDate) {
    return [...data].sort((a, b) => {
      const aKey = dateLabelSortKey(String(a[dimField] ?? ''))
      const bKey = dateLabelSortKey(String(b[dimField] ?? ''))
      if (aKey !== 0 && bKey !== 0) return aKey - bKey
      // Fallback: try parsing as dates
      const aDate = tryParseDate(a[dimField])
      const bDate = tryParseDate(b[dimField])
      if (aDate && bDate) return aDate.getTime() - bDate.getTime()
      return String(a[dimField] ?? '').localeCompare(String(b[dimField] ?? ''))
    })
  }

  return [...data].sort((a, b) =>
    String(a[dimField] ?? '').localeCompare(String(b[dimField] ?? ''))
  )
}
