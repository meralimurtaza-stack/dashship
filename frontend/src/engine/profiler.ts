import type {
  ColumnSchema,
  ColumnType,
  FieldRole,
  DataSchema,
  DataProfile,
  ColumnProfile,
  NumericProfile,
  CategoricalProfile,
  DateProfile,
  BooleanProfile,
  CorrelationPair,
} from '../types/datasource'

// ── Type Detection ──────────────────────────────────────────────

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{2}\/\d{2}\/\d{4}$/,
  /^\d{2}-\d{2}-\d{4}$/,
  /^\d{4}\/\d{2}\/\d{2}$/,
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
  /^\d{2}\s\w{3}\s\d{4}$/,
  /^\w{3}\s\d{2},?\s\d{4}$/,
]

const BOOLEAN_VALUES = new Set([
  'true', 'false', 'yes', 'no', '1', '0', 't', 'f', 'y', 'n',
])

function isNumericString(v: string): boolean {
  if (v === '') return false
  const cleaned = v.replace(/[,$£€¥%]/g, '').trim()
  return cleaned !== '' && !isNaN(Number(cleaned))
}

function isDateString(v: string): boolean {
  if (v === '') return false
  if (DATE_PATTERNS.some((p) => p.test(v.trim()))) return true
  const d = new Date(v)
  return !isNaN(d.getTime()) && v.trim().length >= 6
}

function isBooleanString(v: string): boolean {
  return BOOLEAN_VALUES.has(v.trim().toLowerCase())
}

function detectDateFormat(values: string[]): string | undefined {
  const sample = values.find((v) => v.trim() !== '')
  if (!sample) return undefined
  if (/^\d{4}-\d{2}-\d{2}T/.test(sample)) return 'ISO'
  if (/^\d{4}-\d{2}-\d{2}$/.test(sample)) return 'YYYY-MM-DD'
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(sample)) return 'DD/MM/YYYY'
  if (/^\d{2}-\d{2}-\d{4}$/.test(sample)) return 'DD-MM-YYYY'
  return 'auto'
}

export function detectColumnType(
  values: string[]
): { type: ColumnType; dateFormat?: string } {
  const nonEmpty = values.filter((v) => v != null && String(v).trim() !== '')
  if (nonEmpty.length === 0) return { type: 'string' }

  const sampleSize = Math.min(nonEmpty.length, 200)
  const sample = nonEmpty.slice(0, sampleSize)

  let numCount = 0
  let dateCount = 0
  let boolCount = 0

  for (const v of sample) {
    const s = String(v).trim()
    if (isBooleanString(s)) boolCount++
    if (isNumericString(s)) numCount++
    if (isDateString(s)) dateCount++
  }

  const threshold = sampleSize * 0.8

  if (boolCount >= threshold) return { type: 'boolean' }
  if (numCount >= threshold) return { type: 'number' }
  if (dateCount >= threshold) {
    return { type: 'date', dateFormat: detectDateFormat(sample) }
  }
  return { type: 'string' }
}

function inferRole(type: ColumnType, uniqueRatio: number): FieldRole {
  if (type === 'number') return 'measure'
  if (type === 'date') return 'dimension'
  if (type === 'boolean') return 'dimension'
  return uniqueRatio > 0.5 ? 'dimension' : 'dimension'
}

// ── Schema Detection ────────────────────────────────────────────

export function detectSchema(
  headers: string[],
  rows: Record<string, unknown>[],
  fileSizeBytes: number,
  fileType: 'csv' | 'xlsx'
): DataSchema {
  const columns: ColumnSchema[] = headers.map((name) => {
    const values = rows.map((r) => String(r[name] ?? ''))
    const { type, dateFormat } = detectColumnType(values)
    const nonEmpty = values.filter((v) => v.trim() !== '')
    const uniqueCount = new Set(nonEmpty).size
    const uniqueRatio = nonEmpty.length > 0 ? uniqueCount / nonEmpty.length : 0
    const role = inferRole(type, uniqueRatio)
    const sampleValues = [...new Set(nonEmpty)].slice(0, 5)
    const nullable = values.some((v) => v.trim() === '')

    return { name, type, role, dateFormat, nullable, sampleValues }
  })

  return { columns, rowCount: rows.length, fileType, fileSizeBytes }
}

// ── Statistical Profiling ───────────────────────────────────────

function toNumbers(values: string[]): number[] {
  return values
    .map((v) => {
      const cleaned = String(v).replace(/[,$£€¥%]/g, '').trim()
      return Number(cleaned)
    })
    .filter((n) => !isNaN(n))
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

function median(sorted: number[]): number {
  return percentile(sorted, 50)
}

function stdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0
  const sumSqDiff = values.reduce((s, v) => s + (v - mean) ** 2, 0)
  return Math.sqrt(sumSqDiff / (values.length - 1))
}

function profileNumeric(values: string[], totalRows: number): NumericProfile {
  const nums = toNumbers(values)
  const sorted = [...nums].sort((a, b) => a - b)
  const nullCount = totalRows - nums.length
  const mean = nums.length > 0 ? nums.reduce((s, v) => s + v, 0) / nums.length : 0

  return {
    type: 'numeric',
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    mean: round(mean),
    median: round(median(sorted)),
    stdDev: round(stdDev(nums, mean)),
    p25: round(percentile(sorted, 25)),
    p75: round(percentile(sorted, 75)),
    p95: round(percentile(sorted, 95)),
    nullCount,
    nullPercent: round((nullCount / totalRows) * 100),
  }
}

function profileCategorical(
  values: string[],
  totalRows: number
): CategoricalProfile {
  const nonEmpty = values.filter((v) => String(v).trim() !== '')
  const freq = new Map<string, number>()
  for (const v of nonEmpty) {
    const key = String(v).trim()
    freq.set(key, (freq.get(key) ?? 0) + 1)
  }

  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const nullCount = totalRows - nonEmpty.length
  const uniqueCount = freq.size

  return {
    type: 'categorical',
    uniqueCount,
    cardinalityRatio: round(uniqueCount / Math.max(totalRows, 1)),
    topValues: sorted.map(([value, count]) => ({
      value,
      count,
      percent: round((count / totalRows) * 100),
    })),
    nullCount,
    nullPercent: round((nullCount / totalRows) * 100),
  }
}

function profileDate(values: string[], totalRows: number): DateProfile {
  const dates = values
    .map((v) => new Date(String(v).trim()))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  const nullCount = totalRows - dates.length

  if (dates.length < 2) {
    return {
      type: 'date',
      earliest: dates[0]?.toISOString().split('T')[0] ?? 'N/A',
      latest: dates[0]?.toISOString().split('T')[0] ?? 'N/A',
      granularity: 'irregular',
      gapCount: 0,
      nullCount,
      nullPercent: round((nullCount / totalRows) * 100),
    }
  }

  const diffs: number[] = []
  for (let i = 1; i < dates.length; i++) {
    diffs.push(dates[i].getTime() - dates[i - 1].getTime())
  }
  const medianDiff = median([...diffs].sort((a, b) => a - b))
  const dayMs = 86_400_000

  let granularity: DateProfile['granularity'] = 'irregular'
  if (medianDiff < dayMs * 2) granularity = 'daily'
  else if (medianDiff < dayMs * 10) granularity = 'weekly'
  else if (medianDiff < dayMs * 45) granularity = 'monthly'
  else if (medianDiff < dayMs * 400) granularity = 'yearly'

  const expectedDiff = medianDiff
  const gapCount = diffs.filter((d) => d > expectedDiff * 2).length

  return {
    type: 'date',
    earliest: dates[0].toISOString().split('T')[0],
    latest: dates[dates.length - 1].toISOString().split('T')[0],
    granularity,
    gapCount,
    nullCount,
    nullPercent: round((nullCount / totalRows) * 100),
  }
}

function profileBoolean(values: string[], totalRows: number): BooleanProfile {
  const trueSet = new Set(['true', 'yes', '1', 't', 'y'])
  const falseSet = new Set(['false', 'no', '0', 'f', 'n'])
  let trueCount = 0
  let falseCount = 0
  let nullCount = 0

  for (const v of values) {
    const lower = String(v).trim().toLowerCase()
    if (trueSet.has(lower)) trueCount++
    else if (falseSet.has(lower)) falseCount++
    else nullCount++
  }

  return {
    type: 'boolean',
    trueCount,
    falseCount,
    nullCount,
    nullPercent: round((nullCount / totalRows) * 100),
  }
}

// ── Correlation ─────────────────────────────────────────────────

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n < 3) return 0

  const meanX = x.reduce((s, v) => s + v, 0) / n
  const meanY = y.reduce((s, v) => s + v, 0) / n

  let sumXY = 0
  let sumX2 = 0
  let sumY2 = 0

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX
    const dy = y[i] - meanY
    sumXY += dx * dy
    sumX2 += dx * dx
    sumY2 += dy * dy
  }

  const denom = Math.sqrt(sumX2 * sumY2)
  return denom === 0 ? 0 : round(sumXY / denom)
}

// ── Main Profile Generator ──────────────────────────────────────

export function generateProfile(
  schema: DataSchema,
  rows: Record<string, unknown>[]
): DataProfile {
  const totalRows = rows.length
  const columnProfiles: Record<string, ColumnProfile> = {}

  for (const col of schema.columns) {
    const values = rows.map((r) => String(r[col.name] ?? ''))

    switch (col.type) {
      case 'number':
        columnProfiles[col.name] = profileNumeric(values, totalRows)
        break
      case 'date':
        columnProfiles[col.name] = profileDate(values, totalRows)
        break
      case 'boolean':
        columnProfiles[col.name] = profileBoolean(values, totalRows)
        break
      default:
        columnProfiles[col.name] = profileCategorical(values, totalRows)
    }
  }

  // Correlations for numeric columns
  const numericCols = schema.columns.filter((c) => c.type === 'number')
  const numericData: Record<string, number[]> = {}
  for (const col of numericCols) {
    numericData[col.name] = toNumbers(
      rows.map((r) => String(r[col.name] ?? ''))
    )
  }

  const correlations: CorrelationPair[] = []
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i + 1; j < numericCols.length; j++) {
      const c1 = numericCols[i].name
      const c2 = numericCols[j].name
      correlations.push({
        col1: c1,
        col2: c2,
        correlation: pearsonCorrelation(numericData[c1], numericData[c2]),
      })
    }
  }

  // Duplicate rows
  const rowKeys = new Set<string>()
  let dupes = 0
  for (const row of rows) {
    const key = JSON.stringify(row)
    if (rowKeys.has(key)) dupes++
    else rowKeys.add(key)
  }

  const nullCols = Object.values(columnProfiles).filter(
    (p) => p.nullCount > 0
  ).length

  return {
    columns: columnProfiles,
    correlations,
    duplicateRowCount: dupes,
    totalRows,
    qualitySummary: {
      completenessPercent: round(
        ((totalRows * schema.columns.length -
          Object.values(columnProfiles).reduce(
            (s, p) => s + p.nullCount,
            0
          )) /
          (totalRows * schema.columns.length)) *
          100
      ),
      columnsWithNulls: nullCols,
      totalColumns: schema.columns.length,
    },
  }
}

// ── Helpers ─────────────────────────────────────────────────────

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}
