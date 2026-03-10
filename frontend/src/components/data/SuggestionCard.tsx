import { useState, type FC } from 'react'
import type { Suggestion } from '../../types/suggestion'

// ── Action Labels ───────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  rename: 'Rename',
  change_type: 'Type',
  change_role: 'Role',
}

const ACTION_DESCRIPTIONS: Record<string, (s: Suggestion) => string> = {
  rename: (s) => `Rename '${s.fromValue}' → '${s.toValue}'`,
  change_type: (s) => `Change type from ${s.fromValue} → ${s.toValue}`,
  change_role: (s) => `Reclassify from ${s.fromValue} → ${s.toValue}`,
}

// ── Component ───────────────────────────────────────────────────

interface SuggestionCardProps {
  suggestion: Suggestion
  onApply: (suggestion: Suggestion) => void
  onDismiss: (suggestion: Suggestion) => void
}

const SuggestionCard: FC<SuggestionCardProps> = ({ suggestion, onApply, onDismiss }) => {
  const [leaving, setLeaving] = useState(false)

  const label = ACTION_LABELS[suggestion.action] || suggestion.action
  const description = ACTION_DESCRIPTIONS[suggestion.action]?.(suggestion) || ''

  const handleDismiss = () => {
    setLeaving(true)
    setTimeout(() => onDismiss(suggestion), 200)
  }

  const handleApply = () => {
    setLeaving(true)
    setTimeout(() => onApply(suggestion), 200)
  }

  return (
    <div
      className={`border border-gray-200 bg-white p-4 transition-all duration-200 ${
        leaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
    >
      {/* Tag + Column */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-[9px] uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5">
          {label}
        </span>
        <span className="font-mono text-[10px] text-gray-400 truncate">
          {suggestion.column}
        </span>
      </div>

      {/* What */}
      <p className="font-mono text-xs text-ink leading-relaxed mb-1">
        {description}
      </p>

      {/* Why */}
      <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
        {suggestion.reason}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleApply}
          className="bg-accent text-white font-mono text-[10px] uppercase tracking-wide px-4 py-1.5 hover:opacity-90 transition-opacity"
        >
          Apply
        </button>
        <button
          onClick={handleDismiss}
          className="border border-gray-200 text-gray-400 font-mono text-[10px] uppercase tracking-wide px-4 py-1.5 hover:border-gray-400 hover:text-gray-600 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

export default SuggestionCard
