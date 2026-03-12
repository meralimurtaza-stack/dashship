import { useState, useMemo, useCallback, type FC } from 'react'
import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core'
import { useDraggable } from '@dnd-kit/core'
import type { Sheet, FieldBinding } from '../../types/sheet'
import type { ColumnSchema } from '../../types/datasource'
import type { CalculatedField } from '../../engine/formulaParser'
import type { ShelfType } from '../../types/editor'
import { processSheet } from '../../engine/dataEngine'
import ShelfDropZone from './ShelfDropZone'
import MarkTypeSelector from './MarkTypeSelector'
import FormatPanel from './FormatPanel'
import { KPICard, BarChart, LineChart, PieChart, ScatterPlot, DataTable, ChartWrapper } from '../charts'

// ── Field List Item (draggable inside sheet editor) ─────────────

const EditorFieldItem: FC<{
  field: ColumnSchema
}> = ({ field }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `editor-field-${field.name}`,
    data: { type: 'field', field },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-2 px-2 py-1 text-[11px] font-mono cursor-grab active:cursor-grabbing
        hover:bg-gray-50 transition-colors select-none
        ${isDragging ? 'opacity-40' : ''}
      `}
    >
      <span
        className={`w-1.5 h-1.5 shrink-0 ${field.role === 'measure' ? 'bg-accent' : 'bg-gray-400'}`}
        style={{ borderRadius: 1 }}
      />
      <span className="truncate text-ink">{field.displayName || field.name}</span>
    </div>
  )
}

// ── Preview Chart ───────────────────────────────────────────────

const PreviewChart: FC<{
  sheet: Sheet
  data: Record<string, unknown>[]
  calculatedFields?: CalculatedField[]
}> = ({ sheet, data, calculatedFields }) => {
  const result = useMemo(
    () => processSheet(data, sheet, calculatedFields),
    [data, sheet, calculatedFields]
  )
  const { rows, dimensions, measures } = result

  if (rows.length === 0) {
    return (
      <ChartWrapper title={sheet.name} empty emptyMessage="Drop fields onto shelves to build your chart">
        <div />
      </ChartWrapper>
    )
  }

  switch (sheet.markType) {
    case 'text': {
      const mf = measures[0] ?? Object.keys(rows[0] ?? {}).find((k) => !dimensions.includes(k))
      const v = rows[0] && mf ? Number(rows[0][mf] ?? 0) : 0
      return <KPICard label={sheet.name} value={v} format={sheet.encoding.rows} />
    }
    case 'bar':
      return <BarChart data={rows} categoryField={dimensions[0] ?? ''} valueFields={measures.length ? measures : [Object.keys(rows[0] ?? {})[1] ?? '']} title={sheet.name} orientation={sheet.config.orientation} stacked={sheet.config.stacked} showLegend={sheet.config.showLegend} showLabels={sheet.config.showLabels} />
    case 'line':
    case 'area':
      return <LineChart data={rows} xField={dimensions[0] ?? ''} yFields={measures.length ? measures : [Object.keys(rows[0] ?? {})[1] ?? '']} title={sheet.name} areaFill={sheet.markType === 'area'} smooth={sheet.config.smooth} showLegend={sheet.config.showLegend} isDateAxis={sheet.encoding.columns?.format?.type === 'date'} />
    case 'pie':
      return <PieChart data={rows} nameField={dimensions[0] ?? ''} valueField={measures[0] ?? ''} title={sheet.name} showLegend={sheet.config.showLegend} showLabels={sheet.config.showLabels !== false} />
    case 'scatter':
      return <ScatterPlot data={rows} xField={measures[0] ?? ''} yField={measures[1] ?? measures[0] ?? ''} colorField={dimensions[0]} sizeField={sheet.encoding.size?.field} title={sheet.name} showLegend={sheet.config.showLegend} />
    case 'table': {
      const cols = [...dimensions, ...measures]
      return <DataTable data={rows} columns={cols.length ? cols : Object.keys(rows[0] ?? {})} title={sheet.name} />
    }
    default:
      return <ChartWrapper title={sheet.name} empty emptyMessage={`Unknown: ${sheet.markType}`}><div /></ChartWrapper>
  }
}

// ── Sheet Editor ────────────────────────────────────────────────

interface SheetEditorProps {
  sheet: Sheet
  columns: ColumnSchema[]
  data: Record<string, unknown>[]
  calculatedFields?: CalculatedField[]
  onUpdate: (sheet: Sheet) => void
  onDone: () => void
}

const SheetEditor: FC<SheetEditorProps> = ({
  sheet,
  columns,
  data,
  calculatedFields,
  onUpdate,
  onDone,
}) => {
  const [activeField, setActiveField] = useState<string | null>(null)
  const [nameEditing, setNameEditing] = useState(false)
  const [tempName, setTempName] = useState(sheet.name)

  const visibleColumns = useMemo(
    () => columns.filter((c) => !c.hidden),
    [columns]
  )
  const dims = useMemo(() => visibleColumns.filter((c) => c.role === 'dimension'), [visibleColumns])
  const meas = useMemo(() => visibleColumns.filter((c) => c.role === 'measure'), [visibleColumns])

  // ── Shelf update helpers ──────────────────────────────────────

  const updateShelf = useCallback(
    (shelf: ShelfType, binding: FieldBinding | undefined) => {
      if (shelf === 'tooltip') return // handled separately
      onUpdate({ ...sheet, encoding: { ...sheet.encoding, [shelf]: binding } })
    },
    [sheet, onUpdate]
  )

  const updateTooltip = useCallback(
    (bindings: FieldBinding[]) => {
      onUpdate({ ...sheet, encoding: { ...sheet.encoding, tooltip: bindings } })
    },
    [sheet, onUpdate]
  )

  // ── DnD handlers ──────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.type === 'field') {
      setActiveField(data.field.name)
    }
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveField(null)
      const { active, over } = event
      if (!over) return

      const fieldData = active.data.current
      if (fieldData?.type !== 'field') return

      const col = fieldData.field as ColumnSchema
      const shelf = over.data.current?.shelf as ShelfType | undefined
      if (!shelf) return

      const binding: FieldBinding = {
        field: col.name,
        type: col.role,
        aggregation: col.role === 'measure' ? 'sum' : undefined,
      }

      if (shelf === 'tooltip') {
        const existing = sheet.encoding.tooltip ?? []
        if (!existing.some((b) => b.field === col.name)) {
          updateTooltip([...existing, binding])
        }
      } else {
        updateShelf(shelf, binding)
      }
    },
    [sheet, updateShelf, updateTooltip]
  )

  return (
    <div className="fixed inset-0 z-50 bg-page flex flex-col">
      {/* Top bar */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onDone}
            className="p-1 hover:opacity-60 transition-opacity"
            aria-label="Back to dashboard"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </button>
          {nameEditing ? (
            <input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={() => {
                setNameEditing(false)
                if (tempName.trim()) onUpdate({ ...sheet, name: tempName.trim() })
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setNameEditing(false)
                  if (tempName.trim()) onUpdate({ ...sheet, name: tempName.trim() })
                }
              }}
              className="font-mono text-sm font-semibold text-ink bg-transparent border-b border-gray-300 focus:border-gray-900 outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => {
                setTempName(sheet.name)
                setNameEditing(true)
              }}
              className="font-mono text-sm font-semibold text-ink hover:opacity-60 transition-opacity"
            >
              {sheet.name}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <MarkTypeSelector
            value={sheet.markType}
            onChange={(type) => onUpdate({ ...sheet, markType: type })}
          />
          <button
            onClick={onDone}
            className="bg-gray-900 text-white font-mono text-xs uppercase tracking-wide px-5 py-2 hover:bg-gray-800 transition-colors"
            style={{ borderRadius: 2 }}
          >
            Done
          </button>
        </div>
      </div>

      {/* Main area */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 flex overflow-hidden">
          {/* Fields list */}
          <div className="w-[180px] shrink-0 border-r border-gray-200 bg-white overflow-y-auto py-2">
            <p className="px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-gray-400">
              Dimensions
            </p>
            {dims.map((f) => (
              <EditorFieldItem key={f.name} field={f} />
            ))}
            <p className="px-3 py-1 mt-2 font-mono text-[9px] uppercase tracking-widest text-gray-400">
              Measures
            </p>
            {meas.map((f) => (
              <EditorFieldItem key={f.name} field={f} />
            ))}
          </div>

          {/* Centre: shelves + preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Shelves bar */}
            <div className="px-4 py-2 border-b border-gray-200 bg-white shrink-0">
              <div className="grid grid-cols-2 gap-x-6">
                <ShelfDropZone shelf="columns" binding={sheet.encoding.columns} onUpdateBinding={(b) => updateShelf('columns', b)} />
                <ShelfDropZone shelf="rows" binding={sheet.encoding.rows} onUpdateBinding={(b) => updateShelf('rows', b)} />
                <ShelfDropZone shelf="color" binding={sheet.encoding.color} onUpdateBinding={(b) => updateShelf('color', b)} />
                <ShelfDropZone shelf="size" binding={sheet.encoding.size} onUpdateBinding={(b) => updateShelf('size', b)} />
                <ShelfDropZone shelf="label" binding={sheet.encoding.label} onUpdateBinding={(b) => updateShelf('label', b)} />
                <ShelfDropZone shelf="tooltip" bindings={sheet.encoding.tooltip} isArray onUpdateBinding={() => {}} onUpdateBindings={updateTooltip} />
              </div>
            </div>

            {/* Chart preview */}
            <div className="flex-1 overflow-auto p-6 bg-page">
              <div className="max-w-4xl mx-auto h-full min-h-[300px]">
                <PreviewChart sheet={sheet} data={data} calculatedFields={calculatedFields} />
              </div>
            </div>
          </div>

          {/* Format panel */}
          <FormatPanel sheet={sheet} onUpdate={onUpdate} />
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeField && (
            <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono bg-white border border-gray-300 shadow-sm" style={{ borderRadius: 2 }}>
              <span className="w-1.5 h-1.5 bg-gray-400" style={{ borderRadius: 1 }} />
              {activeField}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default SheetEditor
