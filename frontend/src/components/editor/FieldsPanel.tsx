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
        border border-transparent hover:border-gray-200 transition-colors select-none
        ${isDragging ? 'opacity-40' : ''}
      `}
      style={{ borderRadius: 2 }}
    >
      <span
        className={`
          w-1.5 h-1.5 shrink-0
          ${isMeasure ? 'bg-accent' : 'bg-gray-400'}
        `}
        style={{ borderRadius: 1 }}
      />
      <span className="truncate text-ink">{field.displayName || field.name}</span>
      {isCalculated && (
        <span className="ml-auto text-[9px] font-mono uppercase tracking-widest text-accent bg-accent-muted px-1.5 py-0.5" style={{ borderRadius: 2 }}>
          fx
        </span>
      )}
      {isMeasure && !isCalculated && (
        <span className="ml-auto text-[9px] text-gray-400">#</span>
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
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 mb-2">
          Fields
        </p>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search fields..."
          className="w-full px-3 py-1.5 text-xs font-mono bg-gray-100 border-0 outline-none focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:text-gray-400 transition-colors"
          style={{ borderRadius: 2 }}
        />
      </div>

      {/* Field Lists */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Dimensions */}
        {dimensions.length > 0 && (
          <div className="mb-3">
            <p className="px-4 py-1 font-mono text-[9px] uppercase tracking-widest text-gray-400">
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
            <p className="px-4 py-1 font-mono text-[9px] uppercase tracking-widest text-gray-400">
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
            <p className="px-4 py-1 font-mono text-[9px] uppercase tracking-widest text-gray-400">
              Calculated
            </p>
            {calcSchemas.map((f) => (
              <DraggableField key={f.name} field={f} isCalculated />
            ))}
          </div>
        )}

        {dimensions.length === 0 && measures.length === 0 && calcSchemas.length === 0 && (
          <p className="px-4 py-8 text-xs text-gray-400 text-center">
            No fields match.
          </p>
        )}
      </div>

      {/* Add Calculated Field */}
      {onAddCalculatedField && (
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={onAddCalculatedField}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono uppercase tracking-wide text-gray-500 border border-dashed border-gray-300 hover:border-gray-900 hover:text-gray-900 transition-colors"
            style={{ borderRadius: 2 }}
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
