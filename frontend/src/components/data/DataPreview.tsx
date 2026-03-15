import { useState, useMemo, useRef, useEffect, type FC } from 'react'
import type { DataSchema, ColumnType, FieldRole } from '../../types/datasource'
import TypeIcon from './TypeIcon'

interface DataPreviewProps {
  schema: DataSchema
  rows: Record<string, unknown>[]
  maxRows?: number
  showHidden: boolean
  onRenameColumn: (originalName: string, displayName: string) => void
  onChangeType: (columnName: string, type: ColumnType) => void
  onChangeRole: (columnName: string, role: FieldRole) => void
  onToggleVisibility: (columnName: string) => void
}

type SortDir = 'asc' | 'desc' | null

const DataPreview: FC<DataPreviewProps> = ({
  schema, rows, maxRows = 100, showHidden,
  onRenameColumn, onChangeType, onChangeRole, onToggleVisibility,
}) => {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [editingCol, setEditingCol] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSort = (col: string) => {
    if (editingCol) return
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else { setSortCol(null); setSortDir(null) }
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const startEditing = (colName: string, currentDisplay: string) => {
    setEditingCol(colName)
    setEditValue(currentDisplay)
  }

  const commitRename = (originalName: string) => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== originalName) {
      onRenameColumn(originalName, trimmed)
    } else if (trimmed === originalName) {
      onRenameColumn(originalName, '')
    }
    setEditingCol(null)
  }

  useEffect(() => {
    if (editingCol && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCol])

  const visibleCols = showHidden
    ? schema.columns
    : schema.columns.filter((c) => !c.hidden)

  const sortedRows = useMemo(() => {
    const sliced = rows.slice(0, maxRows)
    if (!sortCol || !sortDir) return sliced
    return [...sliced].sort((a, b) => {
      const sa = String(a[sortCol] ?? '')
      const sb = String(b[sortCol] ?? '')
      const na = Number(sa)
      const nb = Number(sb)
      if (!isNaN(na) && !isNaN(nb)) {
        return sortDir === 'asc' ? na - nb : nb - na
      }
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa)
    })
  }, [rows, maxRows, sortCol, sortDir])

  return (
    <div className="border border-ds-border bg-ds-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-ds-border">
        <span className="micro-label">
          Data Grid
        </span>
        <span className="font-mono text-[10px] text-ds-text-dim tabular-nums">
          {Math.min(maxRows, rows.length)} of {rows.length} rows
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ds-border">
              {visibleCols.map((col) => {
                const display = col.displayName || col.name
                const isRenamed = !!col.displayName && col.displayName !== col.name
                const isEditing = editingCol === col.name
                const isHidden = col.hidden ?? false

                return (
                  <th
                    key={col.name}
                    className={`text-left py-2 cursor-pointer hover:bg-ds-surface-alt select-none transition-all duration-200 ${
                      isHidden ? 'opacity-30 px-1 max-w-[40px]' : 'px-3'
                    }`}
                    onClick={() => handleSort(col.name)}
                  >
                    {isEditing ? (
                      <div className="flex flex-col gap-0.5">
                        <input
                          ref={inputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitRename(col.name)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename(col.name)
                            if (e.key === 'Escape') setEditingCol(null)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-[10px] uppercase tracking-widest text-ds-text bg-transparent border-b border-ds-accent outline-none py-0.5 w-full min-w-[60px]"
                        />
                        <span className="font-mono text-[9px] text-ds-text-dim tracking-wide">
                          {col.name}
                        </span>
                      </div>
                    ) : (
                      <div
                        className="flex flex-col gap-0.5"
                        onClick={(e) => { e.stopPropagation(); startEditing(col.name, display) }}
                      >
                        <div className="flex items-center gap-1.5">
                          <TypeIcon
                            type={col.type}
                            onChange={(t) => onChangeType(col.name, t)}
                            size="sm"
                          />
                          <span className="font-mono text-[10px] uppercase tracking-widest text-ds-text truncate">
                            {display}
                          </span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              onChangeRole(
                                col.name,
                                col.role === 'dimension' ? 'measure' : 'dimension'
                              )
                            }}
                            className={`font-mono text-[9px] uppercase px-1 py-0.5 cursor-pointer hover:opacity-80 ${
                              col.role === 'measure'
                                ? 'text-ds-accent bg-ds-accent-glow'
                                : 'text-ds-text-dim bg-ds-surface-alt'
                            }`}
                          >
                            {col.role === 'measure' ? 'M' : 'D'}
                          </span>
                          {sortCol === col.name && (
                            <span className="text-[10px] text-ds-text-dim">
                              {sortDir === 'asc' ? '\u2191' : '\u2193'}
                            </span>
                          )}
                          {/* Eye toggle */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleVisibility(col.name)
                            }}
                            className="ml-auto text-ds-text-dim hover:text-ds-text-muted transition-colors p-0.5"
                            title={isHidden ? 'Show column' : 'Hide column'}
                          >
                            {isHidden ? (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                <line x1="1" y1="1" x2="23" y2="23" />
                              </svg>
                            ) : (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            )}
                          </button>
                        </div>
                        {isRenamed && (
                          <span className="font-mono text-[9px] text-ds-text-dim tracking-wide">
                            {col.name}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-ds-border hover:bg-ds-surface-alt/50 transition-colors"
              >
                {visibleCols.map((col) => {
                  const val = row[col.name]
                  const display = val == null || String(val).trim() === '' ? '\u2014' : String(val)
                  const isNum = col.type === 'number'
                  return (
                    <td
                      key={col.name}
                      className={`py-2 truncate transition-all duration-200 ${
                        col.hidden
                          ? 'opacity-30 px-1 max-w-[40px] overflow-hidden'
                          : 'px-3 max-w-[200px]'
                      } ${
                        isNum
                          ? 'font-mono tabular-nums text-right text-ds-text'
                          : 'text-ds-text-muted'
                      } ${display === '\u2014' ? 'text-ds-text-dim' : ''}`}
                    >
                      {col.hidden ? '' : display}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataPreview
