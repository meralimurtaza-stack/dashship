import type { FieldBinding } from '../types/sheet'

// ── Number Formatting ────────────────────────────────────────────

const SUFFIXES = [
  { threshold: 1_000_000_000, suffix: 'B', divisor: 1_000_000_000 },
  { threshold: 1_000_000, suffix: 'M', divisor: 1_000_000 },
  { threshold: 1_000, suffix: 'K', divisor: 1_000 },
]

export function formatCompact(value: number, decimals = 1): string {
  const abs = Math.abs(value)
  for (const { threshold, suffix, divisor } of SUFFIXES) {
    if (abs >= threshold) {
      const scaled = value / divisor
      return scaled.toFixed(decimals) + suffix
    }
  }
  return Number.isInteger(value) ? value.toString() : value.toFixed(decimals)
}

export function formatNumber(value: number, decimals?: number): string {
  const d = decimals ?? (Number.isInteger(value) ? 0 : 2)
  return value.toLocaleString('en-GB', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })
}

// ── Currency ─────────────────────────────────────────────────────

export function formatCurrency(
  value: number,
  prefix = '£',
  decimals = 2
): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) {
    return `${prefix}${formatCompact(value, 1)}`
  }
  const formatted = Math.abs(value).toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return value < 0 ? `-${prefix}${formatted}` : `${prefix}${formatted}`
}

// ── Percentage ───────────────────────────────────────────────────

export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

// ── Date Formatting ──────────────────────────────────────────────

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function formatDate(value: string | Date, format = 'dd MMM yyyy'): string {
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return String(value)

  const day = d.getDate()
  const month = d.getMonth()
  const year = d.getFullYear()

  switch (format) {
    case 'dd/MM/yyyy':
      return `${pad(day)}/${pad(month + 1)}/${year}`
    case 'MM/dd/yyyy':
      return `${pad(month + 1)}/${pad(day)}/${year}`
    case 'yyyy-MM-dd':
      return `${year}-${pad(month + 1)}-${pad(day)}`
    case 'dd MMM yyyy':
      return `${pad(day)} ${MONTH_SHORT[month]} ${year}`
    case 'MMM yyyy':
      return `${MONTH_SHORT[month]} ${year}`
    case 'MMMM yyyy':
      return `${MONTH_FULL[month]} ${year}`
    case 'MMM dd':
      return `${MONTH_SHORT[month]} ${pad(day)}`
    case 'dd MMM':
      return `${pad(day)} ${MONTH_SHORT[month]}`
    case 'yyyy':
      return String(year)
    case 'Q yyyy': {
      const q = Math.floor(month / 3) + 1
      return `Q${q} ${year}`
    }
    default:
      return `${pad(day)} ${MONTH_SHORT[month]} ${year}`
  }
}

// ── Auto Format ──────────────────────────────────────────────────

export function autoFormat(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'number') {
    if (Math.abs(value) >= 1_000_000) return formatCompact(value)
    if (Number.isInteger(value)) return formatNumber(value, 0)
    return formatNumber(value, 2)
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

// ── Format by FieldBinding ───────────────────────────────────────

export function formatFieldValue(
  value: unknown,
  binding?: FieldBinding
): string {
  if (value == null) return '—'
  if (!binding?.format) return autoFormat(value)

  const fmt = binding.format
  const num = typeof value === 'number' ? value : Number(value)

  switch (fmt.type) {
    case 'number': {
      if (isNaN(num)) return String(value)
      const str = formatNumber(num, fmt.decimals)
      return `${fmt.prefix ?? ''}${str}${fmt.suffix ?? ''}`
    }
    case 'currency': {
      if (isNaN(num)) return String(value)
      return formatCurrency(num, fmt.prefix ?? '£', fmt.decimals ?? 2)
    }
    case 'percent': {
      if (isNaN(num)) return String(value)
      return formatPercent(num, fmt.decimals ?? 1)
    }
    case 'date': {
      return formatDate(String(value), fmt.dateFormat ?? 'dd MMM yyyy')
    }
    case 'string':
    default:
      return String(value)
  }
}

// ── Conditional Color ────────────────────────────────────────────

export type ConditionalColor = 'positive' | 'negative' | 'neutral'

export function getConditionalColor(
  value: number,
  thresholds?: { low?: number; high?: number }
): ConditionalColor {
  const lo = thresholds?.low ?? 0
  const hi = thresholds?.high ?? 0
  if (value > hi) return 'positive'
  if (value < lo) return 'negative'
  return 'neutral'
}

// ── Detect Best Format ───────────────────────────────────────────

export function detectFormat(
  values: number[]
): 'compact' | 'decimal' | 'integer' {
  if (values.length === 0) return 'integer'
  const max = Math.max(...values.map(Math.abs))
  if (max >= 100_000) return 'compact'
  const hasDecimals = values.some((v) => !Number.isInteger(v))
  return hasDecimals ? 'decimal' : 'integer'
}
