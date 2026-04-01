import { useState, useEffect, useCallback, type FC } from 'react'
import type { DataSchema, DataProfile, ColumnType, FieldRole } from '../../types/datasource'
import type { Suggestion, SuggestionStatus } from '../../types/suggestion'
import { fetchSuggestions } from '../../lib/suggestions-api'
import SuggestionCard from './SuggestionCard'

// ── Props ───────────────────────────────────────────────────────

interface AIReviewPanelProps {
  schema: DataSchema
  profile: DataProfile
  fileName?: string
  onRenameColumn: (originalName: string, displayName: string) => void
  onChangeType: (columnName: string, type: ColumnType) => void
  onChangeRole: (columnName: string, role: FieldRole) => void
}

// ── Skeleton Card ───────────────────────────────────────────────

const SkeletonCard: FC = () => (
  <div className="bg-ds-surface p-4 animate-pulse border-ds-border" style={{ borderRadius: 12, border: '0.5px solid var(--color-ds-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
    <div className="flex items-center gap-2 mb-3">
      <div className="h-3 w-12 bg-ds-surface-alt" style={{ borderRadius: 4 }} />
      <div className="h-3 w-20 bg-ds-surface-alt" style={{ borderRadius: 4 }} />
    </div>
    <div className="h-3 w-full bg-ds-surface-alt mb-2" style={{ borderRadius: 4 }} />
    <div className="h-3 w-3/4 bg-ds-surface-alt mb-4" style={{ borderRadius: 4 }} />
    <div className="flex gap-2">
      <div className="h-6 w-16 bg-ds-surface-alt" style={{ borderRadius: 4 }} />
      <div className="h-6 w-16 bg-ds-surface-alt" style={{ borderRadius: 4 }} />
    </div>
  </div>
)

// ── Panel ───────────────────────────────────────────────────────

const AIReviewPanel: FC<AIReviewPanelProps> = ({
  schema, profile, fileName,
  onRenameColumn, onChangeType, onChangeRole,
}) => {
  const [collapsed, setCollapsed] = useState(false)
  const [status, setStatus] = useState<SuggestionStatus>('idle')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [error, setError] = useState<string | null>(null)

  const analyse = useCallback(async () => {
    setStatus('loading')
    setError(null)
    setSuggestions([])
    try {
      const result = await fetchSuggestions(schema, profile, fileName)
      setSuggestions(result)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get suggestions')
      setStatus('error')
    }
  }, [schema, profile, fileName])

  // Auto-run on mount
  useEffect(() => {
    analyse()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApply = (suggestion: Suggestion) => {
    switch (suggestion.action) {
      case 'rename':
        onRenameColumn(suggestion.column, suggestion.toValue)
        break
      case 'change_type':
        onChangeType(suggestion.column, suggestion.toValue as ColumnType)
        break
      case 'change_role':
        onChangeRole(suggestion.column, suggestion.toValue as FieldRole)
        break
    }
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))
  }

  const handleDismiss = (suggestion: Suggestion) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))
  }

  const allReviewed = status === 'done' && suggestions.length === 0

  return (
    <div className={`bg-ds-bg transition-all duration-300 ${collapsed ? 'w-12' : 'w-80'} flex-shrink-0 flex flex-col`} style={{ borderLeft: '0.5px solid var(--color-ds-border)' }}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between" style={{ borderBottom: '0.5px solid var(--color-ds-border)' }}>
        {!collapsed && (
          <h2 className="micro-label">
            AI Review
          </h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-ds-text-dim hover:text-ds-text transition-colors p-1"
          title={collapsed ? 'Expand panel' : 'Collapse panel'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            {collapsed ? (
              <path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </div>

      {collapsed ? null : (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Loading */}
          {status === 'loading' && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-ds-accent rounded-full animate-pulse" />
                <span className="micro-label">
                  Analysing your data...
                </span>
              </div>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="space-y-3">
              <p className="font-mono text-[10px] text-ds-text-dim">{error}</p>
              <button
                onClick={analyse}
                className="text-ds-text-muted font-mono text-[10px] uppercase tracking-wide px-4 py-2 hover:border-ds-accent hover:text-ds-text transition-colors w-full"
                style={{ borderRadius: 8, border: '0.5px solid var(--color-ds-border)' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Suggestion Cards */}
          {status === 'done' && suggestions.length > 0 && (
            <>
              <p className="micro-label mb-1">
                {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
              </p>
              {suggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  onApply={handleApply}
                  onDismiss={handleDismiss}
                />
              ))}
            </>
          )}

          {/* All Reviewed */}
          {allReviewed && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <p className="font-mono text-xs text-ds-text-dim text-center">
                All suggestions reviewed.
              </p>
              <button
                onClick={analyse}
                className="text-ds-text-muted font-mono text-[10px] uppercase tracking-wide px-4 py-2 hover:border-ds-accent hover:text-ds-text transition-colors"
                style={{ borderRadius: 8, border: '0.5px solid var(--color-ds-border)' }}
              >
                Re-analyse
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AIReviewPanel
