import { type FC } from 'react'

/**
 * Lightweight markdown renderer for Claude chat responses.
 * Handles: headers, bold, italic, code blocks, inline code, lists, paragraphs.
 * Lines with "Name = FORMULA" render as calculation cards with Approve/Edit buttons.
 * No external dependency needed.
 */

interface MarkdownProps {
  content: string
  onCalcAction?: (action: string) => void
}

// ── Inline formatting ───────────────────────────────────────────

function renderInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  // Match: **bold**, *italic*, `code`
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g
  let lastIdx = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index))
    }
    if (match[1]) {
      parts.push(<strong key={key++} className="font-medium text-ds-text">{match[2]}</strong>)
    } else if (match[3]) {
      parts.push(<em key={key++} className="italic">{match[4]}</em>)
    } else if (match[5]) {
      parts.push(
        <code key={key++} className="font-mono text-[0.85em] bg-ds-surface-alt px-1.5 py-0.5 text-ds-text" style={{ borderRadius: 4 }}>
          {match[6]}
        </code>
      )
    }
    lastIdx = match.index + match[0].length
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx))
  }

  return parts.length > 0 ? parts : [text]
}

// ── Block parsing ───────────────────────────────────────────────

interface Block {
  type: 'heading' | 'code' | 'list' | 'paragraph'
  level?: number       // heading level (1-3)
  lang?: string        // code block language
  content: string      // raw text content
  items?: string[]     // list items
  ordered?: boolean    // numbered list?
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block (fenced)
    if (line.trimStart().startsWith('```')) {
      const lang = line.trim().slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push({ type: 'code', lang, content: codeLines.join('\n') })
      i++ // skip closing ```
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      })
      i++
      continue
    }

    // List (unordered or ordered)
    if (/^\s*[-*]\s/.test(line) || /^\s*\d+\.\s/.test(line)) {
      const items: string[] = []
      const ordered = /^\s*\d+\.\s/.test(line)
      while (
        i < lines.length &&
        (/^\s*[-*]\s/.test(lines[i]) || /^\s*\d+\.\s/.test(lines[i]))
      ) {
        items.push(lines[i].replace(/^\s*[-*]\s/, '').replace(/^\s*\d+\.\s/, ''))
        i++
      }
      blocks.push({ type: 'list', content: '', items, ordered })
      continue
    }

    // Empty line — skip
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph (collect consecutive non-empty lines)
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trimStart().startsWith('```') &&
      !lines[i].match(/^#{1,3}\s/) &&
      !/^\s*[-*]\s/.test(lines[i]) &&
      !/^\s*\d+\.\s/.test(lines[i])
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paraLines.join(' ') })
    }
  }

  return blocks
}

// ── Calculation detection ───────────────────────────────────────

const CALC_PATTERN = /=\s*\S/

/** True when a text line looks like a calculated-field definition */
function isCalcLine(text: string): boolean {
  const plain = text.replace(/\*\*/g, '')
  return CALC_PATTERN.test(plain) && plain.indexOf('=') > 0
}

/** True when every item in a list looks like a calculation */
function isCalcBlock(items: string[]): boolean {
  return items.length >= 2 && items.every(isCalcLine)
}

/** Split "**Name** = FORMULA — description" into parts */
function parseCalcLine(raw: string): { name: string; formula: string; description?: string } {
  const stripped = raw.replace(/\*\*/g, '')
  const eqIdx = stripped.indexOf('=')
  if (eqIdx === -1) return { name: stripped, formula: '' }

  const name = stripped.slice(0, eqIdx).trim()
  const rest = stripped.slice(eqIdx + 1).trim()

  const dashMatch = rest.match(/^(.+?)\s+[—–]\s+(.+)$/)
  if (dashMatch) {
    return { name, formula: dashMatch[1].trim(), description: dashMatch[2].trim() }
  }
  return { name, formula: rest }
}

// ── Calculation Card ────────────────────────────────────────────

const CalcCard: FC<{
  raw: string
  onApprove?: (action: string) => void
  onEdit?: (action: string) => void
}> = ({ raw, onApprove, onEdit }) => {
  const { name, formula, description } = parseCalcLine(raw)

  return (
    <div className="flex items-start justify-between gap-3 bg-ds-surface p-3" style={{ borderRadius: 8, border: '0.5px solid var(--color-ds-border)' }}>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm font-medium text-ds-text truncate">{name}</p>
        <p className="font-mono text-xs text-ds-text-muted mt-0.5">
          <span className="text-ds-text-dim">= </span>{formula}
        </p>
        {description && (
          <p className="text-[11px] text-ds-text-dim mt-1 leading-relaxed">{description}</p>
        )}
      </div>
      {(onApprove || onEdit) && (
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {onApprove && (
            <button
              onClick={() => onApprove(`Approve: ${name} = ${formula}`)}
              className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1 bg-ds-accent text-white hover:bg-ds-accent-hover transition-colors"
              style={{ borderRadius: 6 }}
            >
              Approve
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(`Edit: ${name}`)}
              className="font-mono text-[10px] uppercase tracking-wide px-2.5 py-1 border border-ds-border text-ds-text-muted hover:border-ds-accent hover:text-ds-text transition-colors"
              style={{ borderRadius: 6 }}
            >
              Edit
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Choice detection ────────────────────────────────────────────

/** True when a list item looks like a choice: "**Label** — description" or "**Label**: description" */
function isChoiceItem(text: string): boolean {
  return /^\*\*[^*]+\*\*\s*[—–:\-]/.test(text.trim())
}

/** True when an ordered list looks like a set of choices to pick from */
function isChoiceBlock(items: string[], ordered?: boolean): boolean {
  if (!ordered || !items || items.length < 2 || items.length > 6) return false
  // At least 2 items must look like choices
  const choiceCount = items.filter(isChoiceItem).length
  return choiceCount >= 2 && choiceCount >= items.length * 0.6
}

/** Parse "**Label** — description" into parts */
function parseChoiceItem(raw: string): { label: string; description: string } {
  const match = raw.match(/^\*\*([^*]+)\*\*\s*[—–:\-]\s*(.+)$/)
  if (match) return { label: match[1].trim(), description: match[2].trim() }
  // Fallback: just strip bold
  const plain = raw.replace(/\*\*/g, '').trim()
  return { label: plain, description: '' }
}

/** Choice card — clickable option that sends the label back to Captain */
const ChoiceCard: FC<{
  label: string
  description: string
  index: number
  onChoice?: (text: string) => void
}> = ({ label, description, index, onChoice }) => (
  <button
    onClick={() => onChoice?.(label)}
    className="w-full text-left bg-ds-surface px-4 py-3 hover:border-ds-accent transition-colors group"
    style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
  >
    <div className="flex items-start gap-3">
      <span
        className="shrink-0 w-5 h-5 flex items-center justify-center font-mono text-[10px] font-medium text-ds-text-dim bg-ds-surface-alt"
        style={{ borderRadius: 4, border: '0.5px solid var(--color-ds-border)' }}
      >
        {index + 1}
      </span>
      <div className="min-w-0">
        <p className="font-mono text-xs font-medium text-ds-text group-hover:text-ds-accent transition-colors">
          {label}
        </p>
        {description && (
          <p className="text-[11px] text-ds-text-dim mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  </button>
)

// ── Render ──────────────────────────────────────────────────────

const Markdown: FC<MarkdownProps> = ({ content, onCalcAction }) => {
  const blocks = parseBlocks(content)

  return (
    <div className="space-y-3">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            const Tag = block.level === 1 ? 'h3' : block.level === 2 ? 'h4' : 'h5'
            const classes =
              block.level === 1
                ? 'font-mono text-sm font-medium text-ds-text'
                : block.level === 2
                ? 'font-mono text-xs font-medium text-ds-text'
                : 'font-mono text-xs font-medium text-ds-text-muted'
            return (
              <Tag key={idx} className={classes}>
                {renderInline(block.content)}
              </Tag>
            )
          }

          case 'code':
            return (
              <pre
                key={idx}
                className="bg-ds-surface-alt px-4 py-3 overflow-x-auto"
                style={{ borderRadius: 8, border: '0.5px solid var(--color-ds-border)' }}
              >
                <code className="font-mono text-xs text-ds-text leading-relaxed">
                  {block.content}
                </code>
              </pre>
            )

          case 'list': {
            // Calculation block: every item has "= formula"
            if (block.items && isCalcBlock(block.items)) {
              return (
                <div key={idx} className="flex flex-col gap-2">
                  {block.items.map((item, j) => (
                    <CalcCard
                      key={j}
                      raw={item}
                      onApprove={onCalcAction}
                      onEdit={onCalcAction}
                    />
                  ))}
                  {onCalcAction && (
                    <button
                      onClick={() => onCalcAction('Approve all calculated fields')}
                      className="w-full font-mono text-[10px] uppercase tracking-wide px-4 py-2.5 bg-ds-accent text-white hover:bg-ds-accent-hover transition-colors mt-1"
                      style={{ borderRadius: 10 }}
                    >
                      Approve All
                    </button>
                  )}
                </div>
              )
            }
            // Choice block: ordered list with "**Label** — description" items
            if (block.items && isChoiceBlock(block.items, block.ordered)) {
              return (
                <div key={idx} className="flex flex-col gap-2">
                  {block.items.map((item, j) => {
                    const { label, description } = parseChoiceItem(item)
                    return (
                      <ChoiceCard
                        key={j}
                        label={label}
                        description={description}
                        index={j}
                        onChoice={onCalcAction}
                      />
                    )
                  })}
                </div>
              )
            }
            if (block.ordered) {
              return (
                <ol key={idx} className="list-decimal list-inside space-y-1">
                  {block.items?.map((item, j) => (
                    <li key={j} className="text-sm text-ds-text-muted leading-relaxed">
                      {renderInline(item)}
                    </li>
                  ))}
                </ol>
              )
            }
            return (
              <ul key={idx} className="list-disc list-inside space-y-1">
                {block.items?.map((item, j) => (
                  <li key={j} className="text-sm text-ds-text-muted leading-relaxed">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            )
          }

          case 'paragraph':
            return (
              <p key={idx} className="text-sm text-ds-text-muted leading-relaxed">
                {renderInline(block.content)}
              </p>
            )

          default:
            return null
        }
      })}
    </div>
  )
}

export default Markdown
