import { useState, useRef, useEffect, type FC } from 'react'
import type { ColumnSchema, ColumnType, FieldRole, DataProfile, DateProfile } from '../../types/datasource'
import TypeIcon from './TypeIcon'

function formatStat(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2)
}

// ── Editable Field Name ─────────────────────────────────────────

interface EditableFieldNameProps {
  col: ColumnSchema
  onRename: (originalName: string, displayName: string) => void
}

const EditableFieldName: FC<EditableFieldNameProps> = ({ col, onRename }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const display = col.displayName || col.name
  const isRenamed = !!col.displayName && col.displayName !== col.name

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const commit = () => {
    const trimmed = editValue.trim()
    onRename(col.name, trimmed && trimmed !== col.name ? trimmed : '')
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-0.5">
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
          className="font-mono text-sm text-ink bg-transparent border-b border-gray-900 outline-none py-0 w-full min-w-[60px]"
        />
        <span className="font-mono text-[9px] text-gray-400 tracking-wide">{col.name}</span>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col gap-0.5 cursor-pointer group"
      onClick={() => { setEditValue(display); setIsEditing(true) }}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-ink group-hover:border-b group-hover:border-gray-300 transition-colors">
          {display}
        </span>
        {isRenamed && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRename(col.name, '') }}
            className="font-mono text-[9px] text-gray-400 hover:text-gray-600 transition-colors"
            title="Reset to original name"
          >
            reset
          </button>
        )}
      </div>
      {isRenamed && (
        <span className="font-mono text-[9px] text-gray-400 tracking-wide">{col.name}</span>
      )}
    </div>
  )
}

// ── Role Pill ───────────────────────────────────────────────────

const RolePill: FC<{ role: FieldRole; onChange: (r: FieldRole) => void }> = ({ role, onChange }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onChange(role === 'dimension' ? 'measure' : 'dimension') }}
    className={`font-mono text-[9px] uppercase px-2 py-0.5 cursor-pointer transition-colors hover:opacity-80 ${
      role === 'measure' ? 'text-accent bg-accent/8' : 'text-gray-500 bg-gray-100'
    }`}
    title={`Click to convert to ${role === 'dimension' ? 'measure' : 'dimension'}`}
  >
    {role === 'measure' ? 'Measure' : 'Dimension'}
  </button>
)

// ── Eye Toggle ──────────────────────────────────────────────────

const EyeToggle: FC<{ hidden: boolean; onToggle: () => void }> = ({ hidden, onToggle }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onToggle() }}
    className={`w-5 h-5 flex items-center justify-center transition-colors ${
      hidden ? 'text-gray-300 hover:text-gray-500' : 'text-gray-400 hover:text-gray-600'
    }`}
    title={hidden ? 'Show field' : 'Hide field'}
  >
    {hidden ? (
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
)

// ── Field Row ───────────────────────────────────────────────────

interface FieldRowProps {
  col: ColumnSchema
  profile: DataProfile
  onRename: (originalName: string, displayName: string) => void
  onChangeType: (columnName: string, type: ColumnType) => void
  onChangeRole: (columnName: string, role: FieldRole) => void
  onToggleVisibility: (columnName: string) => void
}

const FieldRow: FC<FieldRowProps> = ({
  col, profile, onRename, onChangeType, onChangeRole, onToggleVisibility,
}) => {
  const p = profile.columns[col.name]
  const isHidden = col.hidden ?? false

  return (
    <div className={`flex items-center justify-between px-4 py-3 transition-colors ${isHidden ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3">
        <TypeIcon type={col.type} onChange={(t) => onChangeType(col.name, t)} />
        <EditableFieldName col={col} onRename={onRename} />
        <RolePill role={col.role} onChange={(r) => onChangeRole(col.name, r)} />
      </div>
      <div className="flex items-center gap-4">
        {p?.type === 'categorical' && (
          <span className="font-mono text-[10px] text-gray-400 tabular-nums">{p.uniqueCount} unique</span>
        )}
        {p?.type === 'date' && (
          <span className="font-mono text-[10px] text-gray-400 tabular-nums">
            {(p as DateProfile).earliest} → {(p as DateProfile).latest}
          </span>
        )}
        {p?.type === 'numeric' && (
          <span className="font-mono text-[10px] text-gray-400 tabular-nums">
            {formatStat(p.min)} — {formatStat(p.max)}
          </span>
        )}
        {p && p.nullPercent > 0 && (
          <span className="font-mono text-[10px] text-red-500 tabular-nums">{p.nullPercent}% null</span>
        )}
        <EyeToggle hidden={isHidden} onToggle={() => onToggleVisibility(col.name)} />
      </div>
    </div>
  )
}

export default FieldRow
export { EditableFieldName, RolePill, EyeToggle, formatStat }
