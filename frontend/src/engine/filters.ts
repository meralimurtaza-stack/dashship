import type { SheetFilter } from '../types/sheet'

type DataRow = Record<string, unknown>

// ── Numeric Conversion ───────────────────────────────────────────

function toNum(v: unknown): number {
  if (v == null) return NaN
  if (typeof v === 'number') return v
  const cleaned = String(v).replace(/[,$£€¥%]/g, '').trim()
  return cleaned === '' ? NaN : Number(cleaned)
}

function toDateMs(v: unknown): number {
  if (v == null) return NaN
  const d = new Date(String(v))
  return d.getTime()
}

// ── Filter Evaluation ────────────────────────────────────────────

function matchesFilter(row: DataRow, filter: SheetFilter): boolean {
  const raw = row[filter.field]

  switch (filter.operator) {
    case 'eq': {
      if (raw == null) return filter.value == null
      return String(raw) === String(filter.value)
    }

    case 'neq': {
      if (raw == null) return filter.value != null
      return String(raw) !== String(filter.value)
    }

    case 'gt': {
      const n = toNum(raw)
      if (isNaN(n)) {
        // Try date comparison
        const dRow = toDateMs(raw)
        const dFilter = toDateMs(filter.value)
        if (!isNaN(dRow) && !isNaN(dFilter)) return dRow > dFilter
        return false
      }
      return n > toNum(filter.value)
    }

    case 'gte': {
      const n = toNum(raw)
      if (isNaN(n)) {
        const dRow = toDateMs(raw)
        const dFilter = toDateMs(filter.value)
        if (!isNaN(dRow) && !isNaN(dFilter)) return dRow >= dFilter
        return false
      }
      return n >= toNum(filter.value)
    }

    case 'lt': {
      const n = toNum(raw)
      if (isNaN(n)) {
        const dRow = toDateMs(raw)
        const dFilter = toDateMs(filter.value)
        if (!isNaN(dRow) && !isNaN(dFilter)) return dRow < dFilter
        return false
      }
      return n < toNum(filter.value)
    }

    case 'lte': {
      const n = toNum(raw)
      if (isNaN(n)) {
        const dRow = toDateMs(raw)
        const dFilter = toDateMs(filter.value)
        if (!isNaN(dRow) && !isNaN(dFilter)) return dRow <= dFilter
        return false
      }
      return n <= toNum(filter.value)
    }

    case 'in': {
      if (!Array.isArray(filter.value)) return false
      const strVal = String(raw ?? '')
      return filter.value.some((v) => String(v) === strVal)
    }

    case 'contains': {
      if (raw == null) return false
      return String(raw).toLowerCase().includes(String(filter.value).toLowerCase())
    }

    case 'between': {
      if (!Array.isArray(filter.value) || filter.value.length < 2) return false
      // Try numeric first
      const n = toNum(raw)
      const lo = toNum(filter.value[0])
      const hi = toNum(filter.value[1])
      if (!isNaN(n) && !isNaN(lo) && !isNaN(hi)) {
        return n >= lo && n <= hi
      }
      // Try date comparison
      const dRow = toDateMs(raw)
      const dLo = toDateMs(filter.value[0])
      const dHi = toDateMs(filter.value[1])
      if (!isNaN(dRow) && !isNaN(dLo) && !isNaN(dHi)) {
        return dRow >= dLo && dRow <= dHi
      }
      return false
    }

    default:
      return true
  }
}

// ── Public API ───────────────────────────────────────────────────

export function applyFilters(
  rows: DataRow[],
  filters: SheetFilter[]
): DataRow[] {
  if (filters.length === 0) return rows

  return rows.filter((row) =>
    filters.every((filter) => matchesFilter(row, filter))
  )
}

// ── Date Range Helper ────────────────────────────────────────────

export function createDateRangeFilter(
  field: string,
  start: string,
  end: string
): SheetFilter {
  return {
    field,
    operator: 'between',
    value: [start, end],
  }
}

// ── Multi-Select Dimension Filter Helper ─────────────────────────

export function createMultiSelectFilter(
  field: string,
  values: string[]
): SheetFilter {
  return {
    field,
    operator: 'in',
    value: values,
  }
}

// ── Extract Unique Values for Filter UI ──────────────────────────

export function getUniqueValues(
  rows: DataRow[],
  field: string
): string[] {
  const set = new Set<string>()
  for (const row of rows) {
    const v = row[field]
    if (v != null && String(v).trim() !== '') {
      set.add(String(v))
    }
  }
  return [...set].sort()
}

// ── Get Value Range for Numeric Filter UI ────────────────────────

export function getValueRange(
  rows: DataRow[],
  field: string
): { min: number; max: number } | null {
  let min = Infinity
  let max = -Infinity

  for (const row of rows) {
    const n = toNum(row[field])
    if (!isNaN(n)) {
      if (n < min) min = n
      if (n > max) max = n
    }
  }

  if (min === Infinity) return null
  return { min, max }
}
