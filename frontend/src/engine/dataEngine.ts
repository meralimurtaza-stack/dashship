import type { Sheet, FieldBinding } from '../types/sheet'
import type { CalculatedField } from './formulaParser'
import type { AggregationSpec } from './aggregator'
import { applyCalculatedFields } from './formulaParser'
import { applyFilters } from './filters'
import { aggregate, flattenAggregateResults, sortRows, limitRows } from './aggregator'

// ── Types ────────────────────────────────────────────────────────

type DataRow = Record<string, unknown>

export interface ProcessSheetResult {
  rows: DataRow[]
  dimensions: string[]
  measures: string[]
}

interface CacheEntry {
  key: string
  result: ProcessSheetResult
}

// ── Memoization ──────────────────────────────────────────────────

const cache = new Map<string, CacheEntry>()
const MAX_CACHE_SIZE = 50

function buildCacheKey(
  dataHash: string,
  sheet: Sheet,
  calculatedFields?: CalculatedField[]
): string {
  return JSON.stringify({
    dataHash,
    sheetId: sheet.id,
    encoding: sheet.encoding,
    filters: sheet.filters,
    config: sheet.config,
    calculatedFields: calculatedFields?.map((f) => f.formula),
  })
}

function hashData(rows: DataRow[]): string {
  // Fast hash using row count + sample values
  if (rows.length === 0) return 'empty'
  const first = rows[0]
  const last = rows[rows.length - 1]
  return `${rows.length}:${JSON.stringify(first)}:${JSON.stringify(last)}`
}

function getCached(key: string): ProcessSheetResult | null {
  const entry = cache.get(key)
  if (entry && entry.key === key) return entry.result
  return null
}

function setCache(key: string, result: ProcessSheetResult): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) cache.delete(firstKey)
  }
  cache.set(key, { key, result })
}

export function clearCache(): void {
  cache.clear()
}

// ── Extract Field Info from Sheet ────────────────────────────────

function extractDimensions(sheet: Sheet): string[] {
  const dims: string[] = []
  const addIfDimension = (binding?: FieldBinding) => {
    if (binding && binding.type === 'dimension') dims.push(binding.field)
  }
  addIfDimension(sheet.encoding.columns)
  addIfDimension(sheet.encoding.rows)
  addIfDimension(sheet.encoding.color)
  if (sheet.encoding.detail) {
    for (const d of sheet.encoding.detail) addIfDimension(d)
  }
  return [...new Set(dims)]
}

function extractMeasures(sheet: Sheet): AggregationSpec[] {
  const specs: AggregationSpec[] = []
  const addIfMeasure = (binding?: FieldBinding) => {
    if (!binding || binding.type !== 'measure') return
    specs.push({
      field: binding.field,
      aggregation: binding.aggregation ?? 'sum',
      alias: binding.field,
    })
  }
  addIfMeasure(sheet.encoding.columns)
  addIfMeasure(sheet.encoding.rows)
  addIfMeasure(sheet.encoding.size)
  addIfMeasure(sheet.encoding.label)
  if (sheet.encoding.tooltip) {
    for (const t of sheet.encoding.tooltip) addIfMeasure(t)
  }
  // Deduplicate by alias
  const seen = new Set<string>()
  return specs.filter((s) => {
    if (seen.has(s.alias!)) return false
    seen.add(s.alias!)
    return true
  })
}

// ── Main Pipeline ────────────────────────────────────────────────

/**
 * Pipeline: raw data → calculated fields → filters → aggregation → sort → limit
 *
 * Handles datasets up to 100k rows. Results are memoized when inputs
 * haven't changed.
 */
export function processSheet(
  data: DataRow[],
  sheet: Sheet,
  calculatedFields?: CalculatedField[]
): ProcessSheetResult {
  // Check cache
  const dataHash = hashData(data)
  const cacheKey = buildCacheKey(dataHash, sheet, calculatedFields)
  const cached = getCached(cacheKey)
  if (cached) return cached

  // 1. Apply calculated fields
  let rows = applyCalculatedFields(data, calculatedFields ?? [])

  // 2. Apply filters
  rows = applyFilters(rows, sheet.filters)

  // 3. Extract dimensions and measures from sheet encoding
  const dimensions = extractDimensions(sheet)
  const measureSpecs = extractMeasures(sheet)
  const measureNames = measureSpecs.map((m) => m.alias ?? m.field)

  // 4. Aggregate (if there are dimensions or measures to aggregate)
  if (dimensions.length > 0 || measureSpecs.length > 0) {
    const aggregated = aggregate(rows, dimensions, measureSpecs)
    rows = flattenAggregateResults(aggregated)
  }

  // 5. Sort
  if (sheet.config.sort) {
    rows = sortRows(rows, sheet.config.sort.field, sheet.config.sort.order)
  }

  // 6. Limit
  if (sheet.config.limit) {
    rows = limitRows(rows, sheet.config.limit)
  }

  const result: ProcessSheetResult = {
    rows,
    dimensions,
    measures: measureNames,
  }

  // Cache the result
  setCache(cacheKey, result)
  return result
}

// ── Batch Processing ─────────────────────────────────────────────

export function processSheets(
  data: DataRow[],
  sheets: Sheet[],
  calculatedFields?: CalculatedField[]
): Map<string, ProcessSheetResult> {
  const results = new Map<string, ProcessSheetResult>()
  for (const sheet of sheets) {
    results.set(sheet.id, processSheet(data, sheet, calculatedFields))
  }
  return results
}

// ── Quick Aggregation (no sheet required) ────────────────────────

export function quickAggregate(
  data: DataRow[],
  dimensions: string[],
  measures: AggregationSpec[],
  sort?: { field: string; order: 'asc' | 'desc' },
  limit?: number
): DataRow[] {
  const aggregated = aggregate(data, dimensions, measures)
  let rows = flattenAggregateResults(aggregated)
  if (sort) rows = sortRows(rows, sort.field, sort.order)
  if (limit) rows = limitRows(rows, limit)
  return rows
}
