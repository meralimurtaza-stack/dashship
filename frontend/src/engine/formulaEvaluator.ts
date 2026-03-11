import type { CalculatedField } from './formulaParser'
import { parseFormula } from './formulaParser'

// ── AST Node Type (matches formulaParser) ────────────────────────

type ASTNode =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'field'; name: string }
  | { kind: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { kind: 'comparison'; op: string; left: ASTNode; right: ASTNode }
  | { kind: 'call'; fn: string; args: ASTNode[] }

// ── Helpers ──────────────────────────────────────────────────────

function toNum(v: unknown): number {
  if (v == null) return 0
  const n = Number(String(v).replace(/[,$£€¥%]/g, ''))
  return isNaN(n) ? 0 : n
}

function toDate(v: unknown): Date {
  const d = new Date(String(v))
  return isNaN(d.getTime()) ? new Date() : d
}

// ── Evaluator ────────────────────────────────────────────────────

export function evaluate(node: ASTNode, row: Record<string, unknown>): unknown {
  switch (node.kind) {
    case 'number': return node.value
    case 'string': return node.value
    case 'field': return row[node.name] ?? null

    case 'binary': {
      const l = toNum(evaluate(node.left, row))
      const r = toNum(evaluate(node.right, row))
      if (node.op === '+') return l + r
      if (node.op === '-') return l - r
      if (node.op === '*') return l * r
      if (node.op === '/') return r === 0 ? 0 : l / r
      return 0
    }

    case 'comparison': {
      const l = evaluate(node.left, row)
      const r = evaluate(node.right, row)
      const ln = toNum(l), rn = toNum(r)
      if (node.op === '>') return ln > rn
      if (node.op === '<') return ln < rn
      if (node.op === '>=') return ln >= rn
      if (node.op === '<=') return ln <= rn
      if (node.op === '=' || node.op === '==') return String(l) === String(r)
      if (node.op === '!=') return String(l) !== String(r)
      return false
    }

    case 'call':
      return evaluateFunction(node.fn, node.args, row)
  }
}

function evaluateFunction(
  fn: string,
  args: ASTNode[],
  row: Record<string, unknown>
): unknown {
  switch (fn) {
    case 'ABS': return Math.abs(toNum(evaluate(args[0], row)))
    case 'ROUND': {
      const val = toNum(evaluate(args[0], row))
      const decimals = args[1] ? toNum(evaluate(args[1], row)) : 0
      const f = 10 ** decimals
      return Math.round(val * f) / f
    }
    case 'IF': {
      const cond = evaluate(args[0], row)
      return cond ? evaluate(args[1], row) : evaluate(args[2], row)
    }
    case 'MIN': return Math.min(toNum(evaluate(args[0], row)), toNum(evaluate(args[1], row)))
    case 'MAX': return Math.max(toNum(evaluate(args[0], row)), toNum(evaluate(args[1], row)))
    case 'TODAY': return new Date().toISOString().split('T')[0]
    case 'DATEDIFF': {
      const d1 = toDate(evaluate(args[0], row))
      const d2 = toDate(evaluate(args[1], row))
      const unit = String(evaluate(args[2], row)).toLowerCase()
      const diffMs = d2.getTime() - d1.getTime()
      if (unit === 'days' || unit === 'day') return Math.floor(diffMs / 86_400_000)
      if (unit === 'months' || unit === 'month') {
        return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
      }
      if (unit === 'years' || unit === 'year') return d2.getFullYear() - d1.getFullYear()
      return Math.floor(diffMs / 86_400_000)
    }
    case 'DATEADD': {
      const d = toDate(evaluate(args[0], row))
      const amount = toNum(evaluate(args[1], row))
      const unit = String(evaluate(args[2], row)).toLowerCase()
      const result = new Date(d)
      if (unit === 'days' || unit === 'day') result.setDate(result.getDate() + amount)
      else if (unit === 'months' || unit === 'month') result.setMonth(result.getMonth() + amount)
      else if (unit === 'years' || unit === 'year') result.setFullYear(result.getFullYear() + amount)
      return result.toISOString().split('T')[0]
    }
    default: return null
  }
}

// ── Public API ───────────────────────────────────────────────────

export function evaluateFormula(
  formula: string,
  row: Record<string, unknown>
): unknown {
  const ast = parseFormula(formula)
  return evaluate(ast, row)
}

export function applyCalculatedFields(
  rows: Record<string, unknown>[],
  fields: CalculatedField[]
): Record<string, unknown>[] {
  if (fields.length === 0) return rows
  return rows.map((row) => {
    const extended = { ...row }
    for (const field of fields) {
      extended[field.name] = evaluateFormula(field.formula, extended)
    }
    return extended
  })
}
