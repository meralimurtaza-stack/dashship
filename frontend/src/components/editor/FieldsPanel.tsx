import { useState, useMemo, type FC } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { ColumnSchema } from '../../types/datasource'

// ── Draggable Field Item ────────────────────────────────────────

const DraggableField: FC<{
  field: ColumnSchema
  isCalculated?: boolean
}> = ({ field, isCalculated }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `field-${field.name}`,
    data: { type: 'field', field },
  })

  const isMeasure = field.role === 'measure'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-2 px-3 py-1.5 text-xs font-mono cursor-grab active:cursor-grabbing
        border border-transparent hover:border-ds-border transition-colors select-none
        ${isDragging ? 'opacity-40' : ''}
      `}
    >
      <span
        className={`
          w-1.5 h-1.5 shrink-0
          ${isMeasure ? 'bg-ds-accent' : 'bg-ds-text-dim'}
        `}
        style={{ borderRadius: 1 }}
      />
      <span className="truncate text-ds-text">{field.displayName || field.name}</span>
      {isCalculated && (
        <span className="ml-auto text-[9px] font-mono uppercase tracking-widest text-ds-accent bg-ds-accent-glow px-1.5 py-0.5">
          fx
        </span>
      )}
      {isMeasure && !isCalculated && (
        <span className="ml-auto text-[9px] text-ds-text-dim">#</span>
      )}
    </div>
  )
}

// ── Fields Panel ────────────────────────────────────────────────

interface FieldsPanelProps {
  columns: ColumnSchema[]
  calculatedFields?: Array<{ name: string; formula: string }>
  onAddCalculatedField?: () => void
}

const FieldsPanel: FC<FieldsPanelProps> = ({
  columns,
  calculatedFields = [],
  onAddCalculatedField,
}) => {
  const [search, setSearch] = useState('')

  const { dimensions, measures } = useMemo(() => {
    const q = search.toLowerCase()
    const visible = columns.filter(
      (c) =>
        !c.hidden &&
        (c.name.toLowerCase().includes(q) ||
          (c.displayName?.toLowerCase().includes(q) ?? false))
    )
    return {
      dimensions: visible.filter((c) => c.role === 'dimension'),
      measures: visible.filter((c) => c.role === 'measure'),
    }
  }, [columns, search])

  const calcSchemas: ColumnSchema[] = useMemo(
    () =>
      calculatedFields
        .filter((cf) => cf.name.toLowerCase().includes(search.toLowerCase()))
        .map((cf) => ({
          name: cf.name,
          displayName: cf.name,
          type: 'number' as const,
          role: 'measure' as const,
          nullable: false,
          sampleValues: [],
        })),
    [calculatedFields, search]
  )

  return (
    <div className="h-full flex flex-col bg-ds-surface border-r border-ds-border">
      {/* Header */}
      <div className="px-4 py-3 border-b border-ds-border">
        <p className="micro-label mb-2">
          Fields
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search fields..."
          className="w-full px-3 py-1.5 text-xs font-mono bg-ds-surface-alt border-0 outline-none focus:bg-ds-surface focus:ring-1 focus:ring-ds-border-strong placeholder:text-ds-text-dim transition-colors"
        />
      </div>

      {/* Field Lists */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Dimensions */}
        {dimensions.length > 0 && (
          <div className="mb-3">
            <p className="px-4 py-1 font-mono text-[9px] uppercase tracking-widest text-ds-text-dim">
              Dimensions
            </p>
            {dimensions.map((f) => (
              <DraggableField key={f.name} field={f} />
            ))}
          </div>
        )}

        {/* Measures */}
        {measures.length > 0 && (
          <div className="mb-3">
            <p className="px-4 py-1 font-mono text-[9px] uppercase tracking-widest text-ds-text-dim">
              Measures
            </p>
            {measures.map((f) => (
              <DraggableField key={f.name} field={f} />
            ))}
          </div>
        )}

        {/* Calculated Fields */}
        {calcSchemas.length > 0 && (
          <div className="mb-3">
            <p className="px-4 py-1 font-mono text-[9px] uppercase tracking-widest text-ds-text-dim">
              Calculated
            </p>
            {calcSchemas.map((f) => (
              <DraggableField key={f.name} field={f} isCalculated />
            ))}
          </div>
        )}

        {dimensions.length === 0 && measures.length === 0 && calcSchemas.length === 0 && (
          <p className="px-4 py-8 text-xs text-ds-text-dim text-center">
            No fields match.
          </p>
        )}
      </div>

      {/* Add Calculated Field */}
      {onAddCalculatedField && (
        <div className="px-4 py-3 border-t border-ds-border">
          <button
            onClick={onAddCalculatedField}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono uppercase tracking-wide text-ds-text-muted border border-dashed border-ds-border-strong hover:border-ds-accent hover:text-ds-text transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Calculated Field
          </button>
        </div>
      )}
    </div>
  )
}

export default FieldsPanel
