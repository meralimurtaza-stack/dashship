import { useState, type FC } from 'react'
import type { ChangeLogEntry } from '../../types/datasource'

interface ChangeLogProps {
  entries: ChangeLogEntry[]
  onRevert: (id: string) => void
}

function formatEntry(entry: ChangeLogEntry): string {
  switch (entry.action) {
    case 'rename':
      return `Renamed '${entry.from}' → '${entry.to}'`
    case 'change_type':
      return `Changed '${entry.column}' type to ${entry.to}`
    case 'change_role':
      return `Changed '${entry.column}' from ${entry.from} to ${entry.to}`
    case 'toggle_visibility':
      return `${entry.to === 'hidden' ? 'Hid' : 'Showed'} '${entry.column}'`
    default:
      return `Modified '${entry.column}'`
  }
}

const ChangeLog: FC<ChangeLogProps> = ({ entries, onRevert }) => {
  const [expanded, setExpanded] = useState(true)

  if (entries.length === 0) return null

  return (
    <div className="border border-ds-border bg-ds-surface">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-ds-surface-alt transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="micro-label">
            Change Log
          </span>
          <span className="font-mono text-[10px] text-ds-text-dim tabular-nums">
            {entries.length}
          </span>
        </div>
        <svg
          className={`w-3 h-3 text-ds-text-dim transition-transform duration-150 ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="divide-y divide-ds-border border-t border-ds-border">
          {[...entries].reverse().map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <span className="font-mono text-[11px] text-ds-text-muted">
                {formatEntry(entry)}
              </span>
              <button
                type="button"
                onClick={() => onRevert(entry.id)}
                className="font-mono text-[10px] uppercase tracking-wide text-ds-text-dim hover:text-ds-text transition-colors px-2 py-1 hover:bg-ds-surface-alt"
              >
                Undo
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default ChangeLog
