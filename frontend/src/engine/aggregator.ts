// ── Types ────────────────────────────────────────────────────────

export type AggregationType = 'sum' | 'avg' | 'count' | 'count_distinct' | 'min' | 'max' | 'none'

export interface AggregationSpec {
  field: string
  aggregation: AggregationType
  alias?: string
}

export interface AggregateResult {
  dimensions: Record<string, unknown>
  measures: Record<string, number>
}

type DataRow = Record<string, unknown>

// ── Numeric Conversion ───────────────────────────────────────────

function toNum(v: unknown): number {
  if (v == null) return NaN
  if (typeof v === 'number') return v
  const cleaned = String(v).replace(/[,$£€¥%]/g, '').trim()
  return cleaned === '' ? NaN : Number(cleaned)
}

// ── Grouping Key ─────────────────────────────────────────────────

function buildGroupKey(row: DataRow, dimensions: string[]): string {
  return dimensions.map((d) => String(row[d] ?? '__null__')).join('\x00')
}

// ── Aggregation Functions ────────────────────────────────────────

function aggregateValues(values: unknown[], agg: AggregationType): number {
  switch (agg) {
    case 'count':
      return values.length

    case 'count_distinct': {
      const set = new Set(values.map((v) => String(v ?? '')))
      return set.size
    }

    case 'sum': {
      let total = 0
      for (const v of values) {
        const n = toNum(v)
        if (!isNaN(n)) total += n
      }
      return total
    }

    case 'avg': {
      let total = 0
      let count = 0
      for (const v of values) {
        const n = toNum(v)
        if (!isNaN(n)) { total += n; count++ }
      }
      return count === 0 ? 0 : total / count
    }

    case 'min': {
      let min = Infinity
      for (const v of values) {
        const n = toNum(v)
        if (!isNaN(n) && n < min) min = n
      }
      return min === Infinity ? 0 : min
    }

    case 'max': {
      let max = -Infinity
      for (const v of values) {
        const n = toNum(v)
        if (!isNaN(n) && n > max) max = n
      }
      return max === -Infinity ? 0 : max
    }

    case 'none': {
      const n = toNum(values[0])
      return isNaN(n) ? 0 : n
    }

    default:
      return 0
  }
}

// ── Main Aggregation Engine ──────────────────────────────────────

export function aggregate(
  rows: DataRow[],
  dimensions: string[],
  measures: AggregationSpec[]
): AggregateResult[] {
  if (rows.length === 0) return []

  // No dimensions = aggregate all rows into one result
  if (dimensions.length === 0) {
    const result: AggregateResult = {
      dimensions: {},
      measures: {},
    }
    for (const m of measures) {
      const values = rows.map((r) => r[m.field])
      const key = m.alias ?? `${m.aggregation}_${m.field}`
      result.measures[key] = aggregateValues(values, m.aggregation)
    }
    return [result]
  }

  // Group rows by dimension values
  const groups = new Map<string, DataRow[]>()
  const dimValues = new Map<string, Record<string, unknown>>()

  for (const row of rows) {
    const key = buildGroupKey(row, dimensions)
    const group = groups.get(key)
    if (group) {
      group.push(row)
    } else {
      groups.set(key, [row])
      const dims: Record<string, unknown> = {}
      for (const d of dimensions) dims[d] = row[d] ?? null
      dimValues.set(key, dims)
    }
  }

  // Compute aggregations per group
  const results: AggregateResult[] = []

  for (const [key, groupRows] of groups) {
    const result: AggregateResult = {
      dimensions: dimValues.get(key)!,
      measures: {},
    }

    for (const m of measures) {
      const values = groupRows.map((r) => r[m.field])
      const alias = m.alias ?? `${m.aggregation}_${m.field}`
      result.measures[alias] = aggregateValues(values, m.aggregation)
    }

    results.push(result)
  }

  return results
}

// ── Flatten Results ──────────────────────────────────────────────

export function flattenAggregateResults(
  results: AggregateResult[]
): DataRow[] {
  return results.map((r) => ({ ...r.dimensions, ...r.measures }))
}

// ── Sort Aggregated Data ─────────────────────────────────────────

export function sortRows(
  rows: DataRow[],
  field: string,
  order: 'asc' | 'desc' = 'asc'
): DataRow[] {
  const sorted = [...rows]
  sorted.sort((a, b) => {
    const va = a[field]
    const vb = b[field]

    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1

    const na = typeof va === 'number' ? va : Number(va)
    const nb = typeof vb === 'number' ? vb : Number(vb)

    if (!isNaN(na) && !isNaN(nb)) {
      return order === 'asc' ? na - nb : nb - na
    }

    const sa = String(va)
    const sb = String(vb)
    const cmp = sa.localeCompare(sb)
    return order === 'asc' ? cmp : -cmp
  })
  return sorted
}

// ── Limit ────────────────────────────────────────────────────────

export function limitRows(rows: DataRow[], limit?: number): DataRow[] {
  if (!limit || limit <= 0) return rows
  return rows.slice(0, limit)
}
