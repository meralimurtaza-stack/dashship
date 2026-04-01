/**
 * ChoiceCards.tsx
 *
 * Renders clickable option cards when Captain presents multiple-choice questions.
 *
 * STRICT detection: Only triggers when the message ends with a clear
 * question-then-choices pattern. Must NOT fire on regular explanatory
 * bullet lists.
 */

import { type FC } from 'react'

interface Choice {
  label: string
  description: string
}

interface ChoiceCardsProps {
  choices: Choice[]
  onSelect: (label: string) => void
}

/**
 * Parse Captain's message to extract choices ONLY from the final
 * question block. Returns null unless the message clearly ends
 * with "Question?\n- **Option** — description" pattern.
 */
export function parseChoices(content: string): Choice[] | null {
  // Strip plan_delta and project-name tags
  const cleaned = content
    .replace(/<plan_delta>[\s\S]*?<\/plan_delta>/g, '')
    .replace(/<plan_delta>[\s\S]*$/g, '')
    .replace(/<project-name>[\s\S]*?<\/project-name>/g, '')
    .trim()

  // Split into lines and work backwards from the end
  const lines = cleaned.split('\n')

  // Collect trailing bullet/numbered items with bold labels
  // Matches: "- **Label** — desc", "* **Label** — desc", "1. **Label** — desc"
  const bulletRegex = /^[\s]*(?:[*\-•]|\d+\.)\s+\*\*([^*]+)\*\*\s*[—:\-–]\s*(.+)$/
  const choices: Choice[] = []
  let i = lines.length - 1

  // Skip trailing empty lines
  while (i >= 0 && lines[i].trim() === '') i--

  // Collect bullet choices from the bottom
  while (i >= 0) {
    const match = lines[i].trim().match(bulletRegex)
    if (match) {
      choices.unshift({
        label: match[1].trim(),
        description: match[2].trim().replace(/\*\*/g, '').slice(0, 200),
      })
      i--
    } else {
      break
    }
  }

  // Need at least 2 choices
  if (choices.length < 2) return null

  // The line just before the choices must contain a question mark
  // (skip blank lines between question and choices)
  while (i >= 0 && lines[i].trim() === '') i--
  if (i < 0) return null

  const questionLine = lines[i].trim()
  if (!questionLine.includes('?')) return null

  // Don't trigger if there are too many choices (likely an explanation, not a question)
  if (choices.length > 6) return null

  return choices
}

/**
 * Check if a message ends with a question that has selectable choices.
 */
export function hasChoiceQuestion(content: string): boolean {
  return parseChoices(content) !== null
}

const ChoiceCards: FC<ChoiceCardsProps> = ({ choices, onSelect }) => {
  return (
    <div className="mt-3 space-y-2">
      {choices.map((choice, i) => (
        <button
          key={i}
          onClick={() => onSelect(choice.label)}
          className="w-full text-left group transition-all duration-150"
          style={{
            padding: '12px 14px',
            border: '0.5px solid rgba(0,0,0,0.08)',
            borderRadius: '10px',
            background: 'var(--color-ds-surface)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-ds-accent)'
            e.currentTarget.style.background = 'var(--color-ds-accent-light)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
            e.currentTarget.style.background = 'var(--color-ds-surface)'
          }}
        >
          <div className="flex items-start gap-2">
            <div
              className="shrink-0 mt-0.5 flex items-center justify-center"
              style={{
                width: 18,
                height: 18,
                borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.12)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-ds-text-dim)',
              }}
            >
              {i + 1}
            </div>
            <div className="min-w-0">
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-ds-text)',
                  display: 'block',
                  lineHeight: 1.3,
                }}
              >
                {choice.label}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-ds-text-muted)',
                  lineHeight: 1.5,
                  display: 'block',
                  marginTop: 2,
                }}
              >
                {choice.description}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

export default ChoiceCards
