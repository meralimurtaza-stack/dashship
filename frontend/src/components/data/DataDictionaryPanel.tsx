import { useState, useEffect, useCallback, type FC } from 'react'
import type { DictionaryEntry } from '../../types/data-dictionary'
import { listEntries, addEntry, deleteEntry } from '../../lib/data-dictionary-storage'

// ── Props ────────────────────────────────────────────────────────

interface DataDictionaryPanelProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  readOnly?: boolean
}

// ── Filter type ──────────────────────────────────────────────────

type FilterMode = 'all' | 'ai' | 'user'

// ── Component ────────────────────────────────────────────────────

const DataDictionaryPanel: FC<DataDictionaryPanelProps> = ({
  projectId,
  isOpen,
  onClose,
  readOnly = false,
}) => {
  const [entries, setEntries] = useState<DictionaryEntry[]>([])
  const [filter, setFilter] = useState<FilterMode>('all')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formFormula, setFormFormula] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // Load entries
  const loadEntries = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listEntries(projectId)
      setEntries(data)
    } catch (err) {
      console.error('[DataDictionary] Failed to load:', err)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (isOpen) loadEntries()
  }, [isOpen, loadEntries])

  // Filter entries
  const filtered = filter === 'all'
    ? entries
    : entries.filter((e) => e.source === filter)

  // Add entry
  const handleAdd = useCallback(async () => {
    if (!formName.trim() || saving) return
    setSaving(true)
    try {
      await addEntry({
        projectId,
        name: formName.trim(),
        formula: formFormula.trim() || undefined,
        description: formDescription.trim() || undefined,
        source: 'user',
      })
      setFormName('')
      setFormFormula('')
      setFormDescription('')
      setShowForm(false)
      await loadEntries()
    } catch (err) {
      console.error('[DataDictionary] Failed to add:', err)
    } finally {
      setSaving(false)
    }
  }, [projectId, formName, formFormula, formDescription, saving, loadEntries])

  // Delete entry
  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteEntry(id)
      setEntries((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      console.error('[DataDictionary] Failed to delete:', err)
    }
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative w-[400px] bg-ds-surface flex flex-col animate-slideRight"
        style={{ borderLeft: '0.5px solid var(--color-ds-border-strong)' }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center justify-between shrink-0"
          style={{ borderBottom: '0.5px solid var(--color-ds-border)' }}
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ds-text-dim">
            Data Dictionary
          </span>
          <button
            onClick={onClose}
            className="p-1 text-ds-text-dim hover:text-ds-text transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter pills + Add button */}
        <div
          className="px-4 py-2.5 flex items-center justify-between shrink-0"
          style={{ borderBottom: '0.5px solid var(--color-ds-border)' }}
        >
          <div className="flex gap-1">
            {(['all', 'ai', 'user'] as FilterMode[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${
                  filter === f
                    ? 'text-ds-text bg-ds-surface-alt'
                    : 'text-ds-text-dim hover:text-ds-text-muted'
                }`}
                style={{
                  border: filter === f ? '0.5px solid var(--color-ds-border-strong)' : '0.5px solid transparent',
                }}
              >
                {f === 'all' ? 'All' : f === 'ai' ? 'AI' : 'User'}
              </button>
            ))}
          </div>
          {!readOnly && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-ds-accent hover:opacity-80 transition-opacity"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Metric
            </button>
          )}
        </div>

        {/* Add form */}
        {showForm && !readOnly && (
          <div
            className="px-4 py-3 space-y-2 shrink-0"
            style={{ borderBottom: '0.5px solid var(--color-ds-border)' }}
          >
            <input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Metric name"
              className="w-full px-3 py-2 font-mono text-xs bg-ds-surface-alt outline-none focus:border-ds-accent transition-colors"
              style={{ border: '0.5px solid var(--color-ds-border-strong)', borderRadius: 0 }}
            />
            <input
              value={formFormula}
              onChange={(e) => setFormFormula(e.target.value)}
              placeholder="Formula (e.g. SUM(Sales) / COUNT(Orders))"
              className="w-full px-3 py-2 font-mono text-xs bg-ds-surface-alt outline-none focus:border-ds-accent transition-colors"
              style={{ border: '0.5px solid var(--color-ds-border-strong)', borderRadius: 0 }}
            />
            <input
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Plain English description"
              className="w-full px-3 py-2 font-sans text-xs bg-ds-surface-alt outline-none focus:border-ds-accent transition-colors"
              style={{ border: '0.5px solid var(--color-ds-border-strong)', borderRadius: 0 }}
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAdd}
                disabled={!formName.trim() || saving}
                className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-wide bg-ds-accent text-white hover:bg-ds-accent-hover disabled:opacity-40 transition-colors"
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-wide text-ds-text-muted hover:text-ds-text transition-colors"
                style={{ border: '0.5px solid var(--color-ds-border-strong)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Entries list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="py-8 text-center">
              <span className="font-mono text-[10px] text-ds-text-dim animate-pulse">Loading...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="font-mono text-xs text-ds-text-dim">No metrics defined yet</p>
              {!readOnly && (
                <p className="font-sans text-[11px] text-ds-text-muted leading-relaxed">
                  Add your company's metrics so Captain always uses the right formulas.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  className="py-2.5 group"
                  style={{ borderBottom: '0.5px solid var(--color-ds-border)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-medium text-ds-text truncate">
                          {entry.name}
                        </span>
                        <span
                          className="shrink-0 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide"
                          style={{
                            color: entry.source === 'ai' ? 'var(--color-ds-accent)' : 'var(--color-ds-gold)',
                            border: `0.5px solid ${entry.source === 'ai' ? 'var(--color-ds-accent)' : 'var(--color-ds-gold)'}`,
                            opacity: 0.7,
                          }}
                        >
                          {entry.source}
                        </span>
                      </div>
                      {entry.formula && (
                        <p className="font-mono text-[11px] text-ds-text-muted mt-1 truncate">
                          {entry.formula}
                        </p>
                      )}
                      {entry.description && (
                        <p className="font-sans text-[11px] text-ds-text-dim mt-0.5 leading-relaxed">
                          {entry.description}
                        </p>
                      )}
                    </div>
                    {!readOnly && (
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-1 text-ds-text-dim opacity-0 group-hover:opacity-100 hover:text-ds-error transition-all shrink-0"
                        title="Remove metric"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-3 shrink-0"
          style={{ borderTop: '0.5px solid var(--color-ds-border)' }}
        >
          <p className="font-sans text-[10px] text-ds-text-dim leading-relaxed">
            Captain references these definitions in every dashboard. Add your company's metrics here and Captain will always use your formula.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DataDictionaryPanel
