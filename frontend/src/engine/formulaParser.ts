// ── Types ────────────────────────────────────────────────────────

export interface CalculatedField {
  name: string
  formula: string
}

export type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'FIELD'
  | 'FUNCTION'
  | 'OPERATOR'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'COMPARISON'
  | 'EOF'

export interface Token {
  type: TokenType
  value: string
}

export type ASTNode =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'field'; name: string }
  | { kind: 'binary'; op: string; left: ASTNode; right: ASTNode }
  | { kind: 'comparison'; op: string; left: ASTNode; right: ASTNode }
  | { kind: 'call'; fn: string; args: ASTNode[] }

// ── Tokenizer ────────────────────────────────────────────────────

const FUNCTIONS = new Set([
  'SUM', 'AVG', 'COUNT', 'COUNT_DISTINCT', 'MIN', 'MAX',
  'IF', 'ROUND', 'ABS', 'DATEDIFF', 'DATEADD', 'TODAY',
])

function tokenize(formula: string): Token[] {
  const tokens: Token[] = []
  let i = 0

  while (i < formula.length) {
    const ch = formula[i]

    if (/\s/.test(ch)) { i++; continue }

    if (ch === '(') { tokens.push({ type: 'LPAREN', value: '(' }); i++; continue }
    if (ch === ')') { tokens.push({ type: 'RPAREN', value: ')' }); i++; continue }
    if (ch === ',') { tokens.push({ type: 'COMMA', value: ',' }); i++; continue }

    // Comparison operators
    if (ch === '>' || ch === '<' || ch === '!' || ch === '=') {
      if (formula[i + 1] === '=') {
        tokens.push({ type: 'COMPARISON', value: formula.slice(i, i + 2) })
        i += 2; continue
      }
      if (ch === '>' || ch === '<') {
        tokens.push({ type: 'COMPARISON', value: ch })
        i++; continue
      }
      if (ch === '=') {
        tokens.push({ type: 'COMPARISON', value: '=' })
        i++; continue
      }
    }

    if (ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      tokens.push({ type: 'OPERATOR', value: ch })
      i++; continue
    }

    // Numbers
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(formula[i + 1] ?? ''))) {
      let num = ''
      while (i < formula.length && (/\d/.test(formula[i]) || formula[i] === '.')) {
        num += formula[i]; i++
      }
      tokens.push({ type: 'NUMBER', value: num }); continue
    }

    // String literals
    if (ch === '"' || ch === "'") {
      const quote = ch; i++
      let str = ''
      while (i < formula.length && formula[i] !== quote) { str += formula[i]; i++ }
      i++ // closing quote
      tokens.push({ type: 'STRING', value: str }); continue
    }

    // Field references in brackets: [Field Name]
    if (ch === '[') {
      i++; let name = ''
      while (i < formula.length && formula[i] !== ']') { name += formula[i]; i++ }
      i++ // closing bracket
      tokens.push({ type: 'FIELD', value: name }); continue
    }

    // Identifiers (function names or bare field names)
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = ''
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
        ident += formula[i]; i++
      }
      if (FUNCTIONS.has(ident.toUpperCase())) {
        tokens.push({ type: 'FUNCTION', value: ident.toUpperCase() })
      } else {
        tokens.push({ type: 'FIELD', value: ident })
      }
      continue
    }

    i++ // skip unknown chars
  }

  tokens.push({ type: 'EOF', value: '' })
  return tokens
}

// ── Parser (recursive descent) ───────────────────────────────────

class Parser {
  private tokens: Token[]
  private pos = 0

  constructor(tokens: Token[]) { this.tokens = tokens }

  private peek(): Token { return this.tokens[this.pos] }
  private advance(): Token { return this.tokens[this.pos++] }

  private expect(type: TokenType): Token {
    const t = this.advance()
    if (t.type !== type) throw new Error(`Expected ${type}, got ${t.type} (${t.value})`)
    return t
  }

  parse(): ASTNode { return this.parseExpression() }

  private parseExpression(): ASTNode {
    let left = this.parseAdditive()
    while (this.peek().type === 'COMPARISON') {
      const op = this.advance().value
      const right = this.parseAdditive()
      left = { kind: 'comparison', op, left, right }
    }
    return left
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative()
    while (this.peek().type === 'OPERATOR' && (this.peek().value === '+' || this.peek().value === '-')) {
      const op = this.advance().value
      const right = this.parseMultiplicative()
      left = { kind: 'binary', op, left, right }
    }
    return left
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parsePrimary()
    while (this.peek().type === 'OPERATOR' && (this.peek().value === '*' || this.peek().value === '/')) {
      const op = this.advance().value
      const right = this.parsePrimary()
      left = { kind: 'binary', op, left, right }
    }
    return left
  }

  private parsePrimary(): ASTNode {
    const t = this.peek()

    if (t.type === 'NUMBER') {
      this.advance()
      return { kind: 'number', value: parseFloat(t.value) }
    }

    if (t.type === 'STRING') {
      this.advance()
      return { kind: 'string', value: t.value }
    }

    if (t.type === 'FIELD') {
      this.advance()
      return { kind: 'field', name: t.value }
    }

    if (t.type === 'FUNCTION') {
      const fn = this.advance().value
      this.expect('LPAREN')
      const args: ASTNode[] = []
      if (this.peek().type !== 'RPAREN') {
        args.push(this.parseExpression())
        while (this.peek().type === 'COMMA') {
          this.advance()
          args.push(this.parseExpression())
        }
      }
      this.expect('RPAREN')
      return { kind: 'call', fn, args }
    }

    if (t.type === 'LPAREN') {
      this.advance()
      const expr = this.parseExpression()
      this.expect('RPAREN')
      return expr
    }

    throw new Error(`Unexpected token: ${t.type} (${t.value})`)
  }
}

// ── Public API ───────────────────────────────────────────────────

const astCache = new Map<string, ASTNode>()

export function parseFormula(formula: string): ASTNode {
  const cached = astCache.get(formula)
  if (cached) return cached
  const tokens = tokenize(formula)
  const ast = new Parser(tokens).parse()
  astCache.set(formula, ast)
  return ast
}

// Re-export evaluator functions for convenience
export { evaluateFormula, applyCalculatedFields } from './formulaEvaluator'
