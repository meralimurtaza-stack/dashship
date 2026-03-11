import { type FC, useMemo } from 'react'
import type { Sheet, DashboardLayout } from '../../types/sheet'
import { processSheet } from '../../engine/dataEngine'
import type { CalculatedField } from '../../engine/formulaParser'
import { KPICard, BarChart, LineChart, PieChart, ScatterPlot, DataTable, ChartWrapper } from '../charts'

interface DashboardRendererProps {
  layout: DashboardLayout
  sheets: Sheet[]
  data: Record<string, unknown>[]
  calculatedFields?: CalculatedField[]
}

// ── Sheet Renderer ───────────────────────────────────────────────

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
      // KPI card — single aggregated value
      const measureField = measures[0] ?? Object.keys(rows[0] ?? {}).find(k => !dimensions.includes(k))
      const value = rows[0] && measureField ? Number(rows[0][measureField] ?? 0) : 0
      return (
        <KPICard
          label={sheet.name}
          value={value}
          format={sheet.encoding.rows}
        />
      )
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
      const tableCols = allCols.length > 0
        ? allCols
        : Object.keys(rows[0] ?? {})
      return (
        <DataTable
          data={rows}
          columns={tableCols}
          title={sheet.name}
        />
      )
    }

    default:
      return (
        <ChartWrapper title={sheet.name} empty emptyMessage={`Unsupported chart type: ${sheet.markType}`}>
          <div />
        </ChartWrapper>
      )
  }
}

// ── Grid Layout ──────────────────────────────────────────────────

const DashboardRenderer: FC<DashboardRendererProps> = ({
  layout,
  sheets,
  data,
  calculatedFields,
}) => {
  console.log(`[DashboardRenderer] Rendering ${sheets.length} sheets with ${data.length} data rows`)
  if (data.length > 0) {
    console.log('[DashboardRenderer] Data columns:', Object.keys(data[0]))
  } else {
    console.warn('[DashboardRenderer] WARNING: data array is empty — charts will show nothing')
  }
  console.log('[DashboardRenderer] Layout items:', layout.items.length)

  const sheetMap = useMemo(() => {
    const map = new Map<string, Sheet>()
    for (const s of sheets) map.set(s.id, s)
    return map
  }, [sheets])

  // Compute total grid height from layout items
  const maxRow = useMemo(() => {
    if (layout.items.length === 0) return 1
    return Math.max(...layout.items.map((item) => item.y + item.h))
  }, [layout.items])

  return (
    <div
      className="grid gap-4 w-full"
      style={{
        gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
        gridTemplateRows: `repeat(${maxRow}, ${layout.rowHeight}px)`,
      }}
    >
      {layout.items.map((item) => {
        const sheet = sheetMap.get(item.sheetId)
        if (!sheet) return null

        return (
          <div
            key={item.sheetId}
            style={{
              gridColumn: `${item.x + 1} / span ${item.w}`,
              gridRow: `${item.y + 1} / span ${item.h}`,
            }}
            className="min-w-0"
          >
            <SheetChart
              sheet={sheet}
              data={data}
              calculatedFields={calculatedFields}
            />
          </div>
        )
      })}
    </div>
  )
}

export default DashboardRenderer
