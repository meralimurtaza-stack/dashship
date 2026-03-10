import { useState, useRef, useEffect, type FC } from 'react'
import type {
  DataSchema,
  DataProfile,
  ColumnSchema,
  ColumnType,
  FieldRole,
} from '../../types/datasource'
import TypeIcon from './TypeIcon'

interface MetadataGridProps {
  schema: DataSchema
  profile: DataProfile
  showHidden: boolean
  onToggleShowHidden: () => void
  onRenameColumn: (originalName: string, displayName: string) => void
  onChangeType: (columnName: string, type: ColumnType) => void
  onChangeRole: (columnName: string, role: FieldRole) => void
  onToggleVisibility: (columnName: string) => void
}

// ── Inline Editable Cell ────────────────────────────────────────

interface EditableCellProps {
  value: string
  originalValue: string
  onCommit: (value: string) => void
}

const EditableCell: FC<EditableCellProps> = ({ value, originalValue, onCommit }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const commit = () => {
    const trimmed = editValue.trim()
    onCommit(trimmed === originalValue ? '' : trimmed)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setIsEditing(false)
        }}
        className="font-mono text-sm text-ink bg-transparent border-b border-gray-900 outline-none py-0 w-full"
      />
    )
  }

  return (
    <span
      className="font-mono text-sm text-ink cursor-pointer hover:border-b hover:border-gray-300 transition-colors"
      onClick={() => { setEditValue(value); setIsEditing(true) }}
    >
      {value}
    </span>
  )
}

// ── Unique Values / Nulls helpers ───────────────────────────────

function getUniques(profile: DataProfile, colName: string): string {
  const p = profile.columns[colName]
  if (!p) return '—'
  if (p.type === 'categorical') return String(p.uniqueCount)
  if (p.type === 'numeric') return '—'
  if (p.type === 'date') return '—'
  if (p.type === 'boolean') return '2'
  return '—'
}

function getNullPercent(profile: DataProfile, colName: string): string {
  const p = profile.columns[colName]
  if (!p) return '0%'
  return `${p.nullPercent}%`
}

function getSamples(col: ColumnSchema): string {
  if (!col.sampleValues || col.sampleValues.length === 0) return '—'
  return col.sampleValues.slice(0, 3).join(', ')
}

// ── Main Component ──────────────────────────────────────────────

const MetadataGrid: FC<MetadataGridProps> = ({
  schema, profile, showHidden, onToggleShowHidden,
  onRenameColumn, onChangeType, onChangeRole, onToggleVisibility,
}) => {
  const hiddenCount = schema.columns.filter((c) => c.hidden).length
  const cols = showHidden
    ? schema.columns
    : schema.columns.filter((c) => !c.hidden)

  return (
    <div className="border border-gray-200 bg-white overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Metadata Grid
        </span>
        <div className="flex items-center gap-4">
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={onToggleShowHidden}
              className="font-mono text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showHidden ? 'Hide hidden' : `+${hiddenCount} hidden`}
            </button>
          )}
          <span className="font-mono text-[10px] text-gray-400 tabular-nums">
            {cols.length} fields
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {['', 'Field Name', 'Original', 'Role', 'Unique', 'Nulls', 'Sample Values', ''].map(
                (h, i) => (
                  <th
                    key={i}
                    className="text-left px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-gray-400 font-normal"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {cols.map((col) => {
              const display = col.displayName || col.name
              const isHidden = col.hidden ?? false
              return (
                <tr
                  key={col.name}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    isHidden ? 'opacity-40' : ''
                  }`}
                >
                  {/* Type Icon */}
                  <td className="px-3 py-2.5">
                    <TypeIcon
                      type={col.type}
                      onChange={(t) => onChangeType(col.name, t)}
                    />
                  </td>

                  {/* Field Name (editable) */}
                  <td className="px-3 py-2.5">
                    <EditableCell
                      value={display}
                      originalValue={col.name}
                      onCommit={(v) => onRenameColumn(col.name, v)}
                    />
                  </td>

                  {/* Original Name */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[11px] text-gray-400">
                      {col.name}
                    </span>
                  </td>

                  {/* Role Pill */}
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        onChangeRole(
                          col.name,
                          col.role === 'dimension' ? 'measure' : 'dimension'
                        )
                      }
                      className={`font-mono text-[9px] uppercase px-2 py-0.5 cursor-pointer transition-colors hover:opacity-80 ${
                        col.role === 'measure'
                          ? 'text-accent bg-accent/8'
                          : 'text-gray-500 bg-gray-100'
                      }`}
                    >
                      {col.role === 'measure' ? 'Measure' : 'Dimension'}
                    </button>
                  </td>

                  {/* Unique Values */}
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[11px] text-gray-500 tabular-nums">
                      {getUniques(profile, col.name)}
                    </span>
                  </td>

                  {/* Nulls % */}
                  <td className="px-3 py-2.5">
                    <span
                      className={`font-mono text-[11px] tabular-nums ${
                        (profile.columns[col.name]?.nullPercent ?? 0) > 0
                          ? 'text-red-500'
                          : 'text-gray-400'
                      }`}
                    >
                      {getNullPercent(profile, col.name)}
                    </span>
                  </td>

                  {/* Sample Values */}
                  <td className="px-3 py-2.5 max-w-[200px]">
                    <span className="font-mono text-[11px] text-gray-500 truncate block">
                      {getSamples(col)}
                    </span>
                  </td>

                  {/* Visibility toggle */}
                  <td className="px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() => onToggleVisibility(col.name)}
                      className={`transition-colors ${
                        isHidden
                          ? 'text-gray-300 hover:text-gray-500'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={isHidden ? 'Show field' : 'Hide field'}
                    >
                      {isHidden ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default MetadataGrid
