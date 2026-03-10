import { useState, type FC } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { DataSchema, DataProfile, ColumnType, FieldRole, ColumnSchema } from '../../types/datasource'
import FieldRow, { formatStat } from './FieldRow'

// ── Props ───────────────────────────────────────────────────────

interface SchemaViewerProps {
  schema: DataSchema
  profile: DataProfile
  showHidden: boolean
  onToggleShowHidden: () => void
  onRenameColumn: (originalName: string, displayName: string) => void
  onChangeType: (columnName: string, type: ColumnType) => void
  onChangeRole: (columnName: string, role: FieldRole) => void
  onToggleVisibility: (columnName: string) => void
}

// ── Draggable Field Row ─────────────────────────────────────────

interface DraggableFieldProps {
  col: ColumnSchema
  profile: DataProfile
  onRename: (originalName: string, displayName: string) => void
  onChangeType: (columnName: string, type: ColumnType) => void
  onChangeRole: (columnName: string, role: FieldRole) => void
  onToggleVisibility: (columnName: string) => void
}

const DraggableField: FC<DraggableFieldProps> = ({
  col, profile, onRename, onChangeType, onChangeRole, onToggleVisibility,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: col.name,
    data: { col },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`transition-all duration-150 ${
        isDragging ? 'opacity-30 scale-[0.98]' : 'opacity-100'
      }`}
      style={{ touchAction: 'none' }}
    >
      <FieldRow
        col={col}
        profile={profile}
        onRename={onRename}
        onChangeType={onChangeType}
        onChangeRole={onChangeRole}
        onToggleVisibility={onToggleVisibility}
      />
    </div>
  )
}

// ── Drag Overlay Preview ────────────────────────────────────────

const DragPreview: FC<{ col: ColumnSchema }> = ({ col }) => {
  const display = col.displayName || col.name
  return (
    <div className="border border-gray-900 bg-white px-4 py-2 shadow-sm flex items-center gap-2 max-w-xs cursor-grabbing">
      <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 ${
        col.role === 'measure' ? 'text-accent bg-accent/8' : 'text-gray-500 bg-gray-100'
      }`}>
        {col.role === 'measure' ? 'M' : 'D'}
      </span>
      <span className="font-mono text-sm text-ink truncate">{display}</span>
    </div>
  )
}

// ── Droppable Group ─────────────────────────────────────────────

interface DroppableGroupProps {
  id: string
  label: string
  count: number
  children: React.ReactNode
  isOver: boolean
  canDrop: boolean
}

const DroppableGroup: FC<DroppableGroupProps> = ({
  id, label, count, children, isOver, canDrop,
}) => {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`border bg-white transition-all duration-200 ${
        isOver && canDrop
          ? 'border-accent ring-2 ring-accent/20'
          : 'border-gray-200'
      }`}
    >
      <div className={`px-4 py-3 border-b transition-colors duration-200 ${
        isOver && canDrop ? 'border-accent/30 bg-accent/4' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            {label} ({count})
          </span>
          {isOver && canDrop && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-accent animate-pulse">
              Drop to reclassify
            </span>
          )}
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {children}
      </div>
      {count === 0 && (
        <div className="px-4 py-6 text-center">
          <span className="font-mono text-[10px] text-gray-300 uppercase tracking-widest">
            {isOver && canDrop ? 'Drop here' : 'No fields'}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────

const SchemaViewer: FC<SchemaViewerProps> = ({
  schema, profile, showHidden, onToggleShowHidden,
  onRenameColumn, onChangeType, onChangeRole, onToggleVisibility,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const hiddenCount = schema.columns.filter((c) => c.hidden).length
  const visibleCols = showHidden
    ? schema.columns
    : schema.columns.filter((c) => !c.hidden)

  const dimensions = visibleCols.filter((c) => c.role === 'dimension')
  const measures = visibleCols.filter((c) => c.role === 'measure')

  const activeCol = activeId
    ? schema.columns.find((c) => c.name === activeId) ?? null
    : null

  // Can only drop into the opposite group
  const activeRole = activeCol?.role
  const canDropDimensions = activeRole === 'measure'
  const canDropMeasures = activeRole === 'dimension'

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragOver = (event: { over: { id: string | number } | null }) => {
    setOverId(event.over ? String(event.over.id) : null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverId(null)

    if (!over || !active) return

    const colName = String(active.id)
    const target = String(over.id)
    const col = schema.columns.find((c) => c.name === colName)
    if (!col) return

    // Only reclassify if dropped on the opposite group
    if (target === 'dimensions' && col.role === 'measure') {
      onChangeRole(colName, 'dimension')
    } else if (target === 'measures' && col.role === 'dimension') {
      onChangeRole(colName, 'measure')
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setOverId(null)
  }

  const fieldProps = {
    profile,
    onRename: onRenameColumn,
    onChangeType,
    onChangeRole,
    onToggleVisibility,
  }

  return (
    <div className="space-y-6">
      {/* Quality summary */}
      <div className="grid grid-cols-4 gap-px bg-gray-200">
        {[
          { label: 'Rows', value: formatStat(schema.rowCount) },
          { label: 'Columns', value: String(schema.columns.length) },
          { label: 'Complete', value: `${profile.qualitySummary.completenessPercent}%` },
          { label: 'Duplicates', value: formatStat(profile.duplicateRowCount) },
        ].map((item) => (
          <div key={item.label} className="bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              {item.label}
            </p>
            <p className="font-mono text-lg font-semibold text-ink tabular-nums mt-1">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Show hidden toggle */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={onToggleShowHidden}
          className="font-mono text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showHidden ? 'Hide hidden fields' : `Show ${hiddenCount} hidden field${hiddenCount > 1 ? 's' : ''}`}
        </button>
      )}

      {/* Drag hint */}
      <p className="font-mono text-[9px] text-gray-300 tracking-wide">
        Drag fields between groups to reclassify
      </p>

      {/* Dimensions + Measures with DnD */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="space-y-6">
          {/* Dimensions */}
          <DroppableGroup
            id="dimensions"
            label="Dimensions"
            count={dimensions.length}
            isOver={overId === 'dimensions'}
            canDrop={canDropDimensions}
          >
            {dimensions.map((col) => (
              <DraggableField key={col.name} col={col} {...fieldProps} />
            ))}
          </DroppableGroup>

          {/* Measures */}
          <DroppableGroup
            id="measures"
            label="Measures"
            count={measures.length}
            isOver={overId === 'measures'}
            canDrop={canDropMeasures}
          >
            {measures.map((col) => (
              <DraggableField key={col.name} col={col} {...fieldProps} />
            ))}
          </DroppableGroup>
        </div>

        {/* Drag overlay — follows cursor */}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeCol ? <DragPreview col={activeCol} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default SchemaViewer
