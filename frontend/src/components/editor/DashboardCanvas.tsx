import { useMemo, useCallback, type FC } from 'react'
import type { Sheet, DashboardLayout } from '../../types/sheet'
import type { CalculatedField } from '../../engine/formulaParser'
import { processSheet } from '../../engine/dataEngine'
import { KPICard, BarChart, LineChart, PieChart, ScatterPlot, DataTable, ChartWrapper } from '../charts'
import ErrorBoundary from '../ui/ErrorBoundary'

interface DashboardCanvasProps {
  layout: DashboardLayout
  sheets: Sheet[]
  data: Record<string, unknown>[]
  calculatedFields?: CalculatedField[]
  selectedSheetId: string | null
  onSelectSheet: (sheetId: string | null) => void
  onEditSheet: (sheetId: string) => void
  onDeleteSheet: (sheetId: string) => void
  onAddChart: () => void
  onMoveItem: (sheetId: string, x: number, y: number) => void
  onResizeItem: (sheetId: string, w: number, h: number) => void
}

// ── Mini Chart Renderer (reuses existing chart components) ──────

const SheetChart: FC<{
  sheet: Sheet
  data: Record<string, unknown>[]
  calculatedFields?: CalculatedField[]
}> = ({ sheet, data, calculatedFields }) => {
  const result = useMemo(
    () => processSheet(data, sheet, calculatedFields),
    [data, sheet, calculatedFields]
  )

  const { rows, dimensions, measures } = result

  switch (sheet.markType) {
    case 'text': {
      const measureField = measures[0] ?? Object.keys(rows[0] ?? {}).find((k) => !dimensions.includes(k))
      const value = rows[0] && measureField ? Number(rows[0][measureField] ?? 0) : 0
      return <KPICard label={sheet.name} value={value} format={sheet.encoding.rows} />
    }
    case 'bar':
      return (
        <BarChart
          data={rows}
          categoryField={dimensions[0] ?? ''}
          valueFields={measures.length > 0 ? measures : [Object.keys(rows[0] ?? {})[1] ?? '']}
          title={sheet.name}
          orientation={sheet.config.orientation}
          stacked={sheet.config.stacked}
          showLegend={sheet.config.showLegend}
          showLabels={sheet.config.showLabels}
        />
      )
    case 'line':
    case 'area':
      return (
        <LineChart
          data={rows}
          xField={dimensions[0] ?? ''}
          yFields={measures.length > 0 ? measures : [Object.keys(rows[0] ?? {})[1] ?? '']}
          title={sheet.name}
          areaFill={sheet.markType === 'area'}
          smooth={sheet.config.smooth}
          showLegend={sheet.config.showLegend}
          isDateAxis={sheet.encoding.columns?.format?.type === 'date'}
        />
      )
    case 'pie':
      return (
        <PieChart
          data={rows}
          nameField={dimensions[0] ?? ''}
          valueField={measures[0] ?? ''}
          title={sheet.name}
          showLegend={sheet.config.showLegend}
          showLabels={sheet.config.showLabels !== false}
        />
      )
    case 'scatter':
      return (
        <ScatterPlot
          data={rows}
          xField={measures[0] ?? ''}
          yField={measures[1] ?? measures[0] ?? ''}
          colorField={dimensions[0]}
          sizeField={sheet.encoding.size?.field}
          title={sheet.name}
          showLegend={sheet.config.showLegend}
        />
      )
    case 'table': {
      const allCols = [...dimensions, ...measures]
      return <DataTable data={rows} columns={allCols.length > 0 ? allCols : Object.keys(rows[0] ?? {})} title={sheet.name} />
    }
    default:
      return <ChartWrapper title={sheet.name} empty emptyMessage={`Unknown: ${sheet.markType}`}><div /></ChartWrapper>
  }
}

// ── Chart Card (selectable, editable, deletable) ────────────────

const ChartCard: FC<{
  sheet: Sheet
  data: Record<string, unknown>[]
  calculatedFields?: CalculatedField[]
  layoutItem: { x: number; y: number; w: number; h: number }
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onResize: (w: number, h: number) => void
}> = ({ sheet, data, calculatedFields, layoutItem, isSelected, onSelect, onEdit, onDelete, onResize }) => {
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()
      const el = e.currentTarget as HTMLElement
      el.setPointerCapture(e.pointerId)
      const startX = e.clientX
      const startY = e.clientY
      const startW = layoutItem.w
      const startH = layoutItem.h
      // Approximate column width from parent grid
      const parentEl = el.closest('[data-canvas-grid]') as HTMLElement | null
      const colWidth = parentEl ? parentEl.clientWidth / 12 : 80
      const rowHeight = 60

      const handleMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        const newW = Math.max(2, Math.min(12, Math.round(startW + dx / colWidth)))
        const newH = Math.max(2, Math.round(startH + dy / rowHeight))
        onResize(newW, newH)
      }

      const handleUp = () => {
        el.removeEventListener('pointermove', handleMove)
        el.removeEventListener('pointerup', handleUp)
      }

      el.addEventListener('pointermove', handleMove)
      el.addEventListener('pointerup', handleUp)
    },
    [layoutItem.w, layoutItem.h, onResize]
  )

  return (
    <div
      className={`
        relative group bg-ds-surface border overflow-hidden transition-colors
        ${isSelected ? 'border-ds-accent ring-1 ring-ds-accent/20' : 'border-ds-border hover:border-ds-border-strong'}
      `}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onEdit()
      }}
    >
      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className="absolute top-2 right-2 z-10 w-5 h-5 flex items-center justify-center bg-ds-surface border border-ds-border text-ds-text-dim hover:text-ds-error hover:border-ds-error opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label={`Delete ${sheet.name}`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Chart */}
      <div className="w-full h-full pointer-events-none">
        <ErrorBoundary name={sheet.name}>
          <SheetChart sheet={sheet} data={data} calculatedFields={calculatedFields} />
        </ErrorBoundary>
      </div>

      {/* Resize handle */}
      <div
        onPointerDown={handleResizePointerDown}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg className="w-4 h-4 text-ds-text-dim" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
          <circle cx="12" cy="8" r="1.5" />
        </svg>
      </div>
    </div>
  )
}

// ── Dashboard Canvas ────────────────────────────────────────────

const DashboardCanvas: FC<DashboardCanvasProps> = ({
  layout,
  sheets,
  data,
  calculatedFields,
  selectedSheetId,
  onSelectSheet,
  onEditSheet,
  onDeleteSheet,
  onAddChart,
  onMoveItem: _onMoveItem,
  onResizeItem,
}) => {
  const sheetMap = useMemo(() => {
    const map = new Map<string, Sheet>()
    for (const s of sheets) map.set(s.id, s)
    return map
  }, [sheets])

  const maxRow = useMemo(() => {
    if (layout.items.length === 0) return 4
    return Math.max(...layout.items.map((item) => item.y + item.h)) + 2
  }, [layout.items])

  if (sheets.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-ds-bg">
        <div className="text-center space-y-3">
          <p className="micro-label">
            Canvas
          </p>
          <h3 className="font-mono text-xl font-medium text-ds-text">
            Empty dashboard
          </h3>
          <p className="text-xs text-ds-text-muted max-w-xs">
            Add charts using the button below or ask Captain to generate them.
          </p>
          <button
            onClick={onAddChart}
            className="inline-flex items-center gap-1.5 bg-ds-accent text-white font-mono text-xs uppercase tracking-wide px-5 py-2.5 hover:bg-ds-accent-hover transition-colors mt-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Chart
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-auto bg-ds-bg p-6"
      onClick={() => onSelectSheet(null)}
    >
      {/* Grid */}
      <div
        data-canvas-grid
        className="grid gap-4 w-full"
        style={{
          gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
          gridTemplateRows: `repeat(${maxRow}, ${layout.rowHeight}px)`,
        }}
      >
        {layout.items.map((item, index) => {
          const sheet = sheetMap.get(item.sheetId)
          if (!sheet) return null
          return (
            <div
              key={item.sheetId}
              className="animate-fadeIn"
              style={{
                animationDelay: `${index * 60}ms`,
                animationFillMode: 'both',
                gridColumn: `${item.x + 1} / span ${item.w}`,
                gridRow: `${item.y + 1} / span ${item.h}`,
              }}
            >
              <ChartCard
                sheet={sheet}
                data={data}
                calculatedFields={calculatedFields}
                layoutItem={item}
                isSelected={selectedSheetId === item.sheetId}
                onSelect={() => onSelectSheet(item.sheetId)}
                onEdit={() => onEditSheet(item.sheetId)}
                onDelete={() => onDeleteSheet(item.sheetId)}
                onResize={(w, h) => onResizeItem(item.sheetId, w, h)}
              />
            </div>
          )
        })}
      </div>

      {/* Add Chart button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddChart()
          }}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-wide text-ds-text-dim border border-dashed border-ds-border-strong hover:border-ds-accent hover:text-ds-text transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Chart
        </button>
      </div>
    </div>
  )
}

export default DashboardCanvas
