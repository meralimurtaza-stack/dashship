import { type FC, useMemo, useCallback } from 'react'
import type { Sheet, DashboardLayout } from '../../types/sheet'
import type { ColumnSchema } from '../../types/datasource'
import { processSheetData, type CalculatedFieldDef } from '../../lib/dataEngine'
import type { FormatConfig } from '../../lib/formatValue'
import { KPICard, BarChart, LineChart, PieChart, ScatterPlot, DataTable, ChartCard } from '../charts'
import type { ChartInfo } from '../charts/ChartCard'

// ── Props ────────────────────────────────────────────────────────

interface DashboardRendererProps {
  sheets: Sheet[]
  layout: DashboardLayout
  data: Record<string, unknown>[]
  columns?: ColumnSchema[]
  calculatedFields?: CalculatedFieldDef[]
  onSheetSelect?: (sheetId: string | null) => void
  selectedSheetId?: string | null
}

// ── Helpers ──────────────────────────────────────────────────────

type DataRow = Record<string, unknown>

/** Convert a FieldBinding format to our FormatConfig for chart components */
function toFormatConfig(
  fmt?: { type: 'number' | 'currency' | 'percent' | 'date' | 'string'; decimals?: number; prefix?: string; suffix?: string }
): FormatConfig | undefined {
  if (!fmt) return undefined
  if (fmt.type === 'date' || fmt.type === 'string') return undefined
  return {
    type: fmt.type as FormatConfig['type'],
    decimals: fmt.decimals,
    prefix: fmt.prefix,
    suffix: fmt.suffix,
  }
}

/**
 * Given processSheetData output rows + sheet encoding, figure out:
 * - categoryField: the key used for the grouped dimension
 * - valueFields: the measure column(s)
 */
function deriveFieldNames(
  sheet: Sheet,
  rows: DataRow[]
): { categoryField: string; valueFields: string[] } {
  const dimField = sheet.encoding.columns?.field ?? ''
  const measureField = sheet.encoding.rows?.field

  if (rows.length === 0) {
    return { categoryField: dimField, valueFields: measureField ? [measureField] : ['value'] }
  }

  const firstRow = rows[0]
  const allKeys = Object.keys(firstRow)

  // With color split: value fields are everything except the dimension field
  if (sheet.encoding.color) {
    const valueFields = allKeys.filter(k => k !== dimField)
    return { categoryField: dimField, valueFields }
  }

  // Without color split: measure field is the encoding.rows.field
  if (measureField && measureField in firstRow) {
    return { categoryField: dimField, valueFields: [measureField] }
  }

  // Fallback: first non-dimension key
  const valueFields = allKeys.filter(k => k !== dimField)
  return { categoryField: dimField, valueFields: valueFields.length > 0 ? valueFields : ['value'] }
}

/** Build a ChartInfo object from the sheet encoding and processing result */
function buildChartInfo(
  sheet: Sheet,
  calculatedFields?: CalculatedFieldDef[],
  warnings?: string[]
): ChartInfo {
  const referencedFields = new Set([
    sheet.encoding.columns?.field,
    sheet.encoding.rows?.field,
    sheet.encoding.color?.field,
    sheet.encoding.size?.field,
  ].filter(Boolean) as string[])

  const usedCalcFields = calculatedFields
    ?.filter(cf => referencedFields.has(cf.name))
    .map(cf => cf.name)

  return {
    encoding: {
      columns: sheet.encoding.columns
        ? { field: sheet.encoding.columns.field, aggregation: sheet.encoding.columns.aggregation }
        : undefined,
      rows: sheet.encoding.rows
        ? { field: sheet.encoding.rows.field, aggregation: sheet.encoding.rows.aggregation }
        : undefined,
      color: sheet.encoding.color
        ? { field: sheet.encoding.color.field }
        : undefined,
      size: sheet.encoding.size
        ? { field: sheet.encoding.size.field }
        : undefined,
    },
    markType: sheet.markType,
    calculatedFields: usedCalcFields && usedCalcFields.length > 0 ? usedCalcFields : undefined,
    warnings: warnings && warnings.length > 0 ? warnings : undefined,
  }
}

// ── Sheet Renderer ───────────────────────────────────────────────

const SheetChart: FC<{
  sheet: Sheet
  data: DataRow[]
  columns?: ColumnSchema[]
  calculatedFields?: CalculatedFieldDef[]
  isSelected?: boolean
  onClick?: () => void
  index?: number
}> = ({ sheet, data, columns, calculatedFields, isSelected, onClick, index }) => {
  const result = useMemo(() => {
    try {
      return processSheetData(sheet, data, calculatedFields, columns)
    } catch (err) {
      console.warn(`[DashboardRenderer] processSheetData failed for "${sheet.name}":`, err)
      return null
    }
  }, [sheet, data, calculatedFields, columns])

  const chartInfo = useMemo(
    () => buildChartInfo(sheet, calculatedFields, result?.warnings),
    [sheet, calculatedFields, result?.warnings]
  )

  // Error / empty state
  if (!result || result.data.length === 0) {
    return (
      <ChartCard title={sheet.name} isSelected={isSelected} onClick={onClick} index={index} info={chartInfo}>
        <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#8A8A86' }}>
            No data available
          </span>
        </div>
      </ChartCard>
    )
  }

  // Always render the chart — warnings are surfaced via the info tooltip
  const processed = result.data
  const format = toFormatConfig(sheet.encoding.rows?.format)

  try {
    switch (sheet.markType) {
      case 'text': {
        // KPI — single aggregated value
        const value = Number(processed[0]?.value ?? processed[0]?.[sheet.encoding.rows?.field ?? ''] ?? 0)
        return (
          <KPICard
            label={sheet.name}
            value={value}
            format={format}
            isSelected={isSelected}
            onClick={onClick}
            index={index}
            info={chartInfo}
          />
        )
      }

      case 'line':
      case 'area': {
        const { categoryField, valueFields } = deriveFieldNames(sheet, processed)
        return (
          <LineChart
            data={processed}
            xField={categoryField}
            yFields={valueFields}
            format={format}
            title={sheet.name}
            areaFill={sheet.markType === 'area'}
            smooth={sheet.config.smooth}
            showLegend={sheet.config.showLegend}
            isDateAxis={sheet.encoding.columns?.format?.type === 'date'}
            isSelected={isSelected}
            onClick={onClick}
            index={index}
            info={chartInfo}
          />
        )
      }

      case 'bar': {
        const { categoryField, valueFields } = deriveFieldNames(sheet, processed)
        return (
          <BarChart
            data={processed}
            categoryField={categoryField}
            valueFields={valueFields}
            format={format}
            title={sheet.name}
            orientation={sheet.config.orientation}
            stacked={sheet.config.stacked}
            showLegend={sheet.config.showLegend}
            showLabels={sheet.config.showLabels}
            isSelected={isSelected}
            onClick={onClick}
            index={index}
            info={chartInfo}
          />
        )
      }

      case 'pie': {
        const { categoryField, valueFields } = deriveFieldNames(sheet, processed)
        return (
          <PieChart
            data={processed}
            nameField={categoryField}
            valueField={valueFields[0] ?? 'value'}
            format={format}
            title={sheet.name}
            showLegend={sheet.config.showLegend}
            showLabels={sheet.config.showLabels !== false}
            isSelected={isSelected}
            onClick={onClick}
            index={index}
            info={chartInfo}
          />
        )
      }

      case 'scatter': {
        const xField = sheet.encoding.columns?.field ?? ''
        const yField = sheet.encoding.rows?.field ?? ''
        return (
          <ScatterPlot
            data={processed}
            xField={xField}
            yField={yField}
            xFormat={toFormatConfig(sheet.encoding.columns?.format)}
            yFormat={format}
            colorField={sheet.encoding.color?.field}
            sizeField={sheet.encoding.size?.field}
            title={sheet.name}
            showLegend={sheet.config.showLegend}
            isSelected={isSelected}
            onClick={onClick}
            index={index}
            info={chartInfo}
          />
        )
      }

      case 'table': {
        const dimField = sheet.encoding.columns?.field
        const measureField = sheet.encoding.rows?.field
        const allKeys = Object.keys(processed[0] ?? {})

        let tableColumns: string[]
        if (dimField || measureField) {
          tableColumns = [
            ...(dimField ? [dimField] : []),
            ...(measureField ? [measureField] : []),
          ]
          for (const k of allKeys) {
            if (!tableColumns.includes(k)) tableColumns.push(k)
          }
        } else {
          tableColumns = allKeys
        }

        const formats: Record<string, FormatConfig> = {}
        if (measureField && format) {
          formats[measureField] = format
        }

        return (
          <DataTable
            data={processed}
            columns={tableColumns}
            formats={formats}
            title={sheet.name}
            isSelected={isSelected}
            onClick={onClick}
            index={index}
            info={chartInfo}
          />
        )
      }

      default:
        return (
          <ChartCard title={sheet.name} isSelected={isSelected} onClick={onClick} index={index} info={chartInfo}>
            <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#8A8A86' }}>
                Unsupported: {sheet.markType}
              </span>
            </div>
          </ChartCard>
        )
    }
  } catch (err) {
    console.warn(`[DashboardRenderer] Render failed for "${sheet.name}":`, err)
    return (
      <ChartCard title={sheet.name} isSelected={isSelected} onClick={onClick} index={index} info={chartInfo}>
        <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#8A8A86' }}>
            Error rendering chart
          </span>
        </div>
      </ChartCard>
    )
  }
}

// ── Fallback Auto-Layout ─────────────────────────────────────────

const AutoLayout: FC<{
  sheets: Sheet[]
  data: DataRow[]
  columns?: ColumnSchema[]
  calculatedFields?: CalculatedFieldDef[]
  onSheetSelect?: (sheetId: string | null) => void
  selectedSheetId?: string | null
}> = ({ sheets, data, columns, calculatedFields, onSheetSelect, selectedSheetId }) => {
  const kpis = sheets.filter(s => s.markType === 'text')
  const charts = sheets.filter(s => !['text', 'table'].includes(s.markType))
  const tables = sheets.filter(s => s.markType === 'table')

  let idx = 0

  const handleClick = useCallback(
    (sheetId: string) => {
      if (!onSheetSelect) return
      onSheetSelect(selectedSheetId === sheetId ? null : sheetId)
    },
    [onSheetSelect, selectedSheetId]
  )

  return (
    <div className="flex flex-col gap-3">
      {/* KPI row */}
      {kpis.length > 0 && (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
        >
          {kpis.map(sheet => (
            <SheetChart
              key={sheet.id}
              sheet={sheet}
              data={data}
              columns={columns}
              calculatedFields={calculatedFields}
              isSelected={selectedSheetId === sheet.id}
              onClick={onSheetSelect ? () => handleClick(sheet.id) : undefined}
              index={idx++}
            />
          ))}
        </div>
      )}

      {/* Charts grid */}
      {charts.length > 0 && (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: charts.length === 1 ? '1fr' : 'repeat(2, 1fr)',
          }}
        >
          {charts.map(sheet => {
            const isWide = (sheet.markType === 'line' || sheet.markType === 'area') && charts.length > 1
            return (
              <div
                key={sheet.id}
                style={isWide ? { gridColumn: '1 / -1' } : undefined}
              >
                <SheetChart
                  sheet={sheet}
                  data={data}
                  columns={columns}
                  calculatedFields={calculatedFields}
                  isSelected={selectedSheetId === sheet.id}
                  onClick={onSheetSelect ? () => handleClick(sheet.id) : undefined}
                  index={idx++}
                />
              </div>
            )
          })}
        </div>
      )}

      {/* Tables full width */}
      {tables.length > 0 && (
        <div className="flex flex-col gap-3">
          {tables.map(sheet => (
            <SheetChart
              key={sheet.id}
              sheet={sheet}
              data={data}
              columns={columns}
              calculatedFields={calculatedFields}
              isSelected={selectedSheetId === sheet.id}
              onClick={onSheetSelect ? () => handleClick(sheet.id) : undefined}
              index={idx++}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Grid Layout ──────────────────────────────────────────────────

const DashboardRenderer: FC<DashboardRendererProps> = ({
  sheets,
  layout,
  data,
  columns,
  calculatedFields,
  onSheetSelect,
  selectedSheetId,
}) => {
  const sheetMap = useMemo(() => {
    const map = new Map<string, Sheet>()
    for (const s of sheets) map.set(s.id, s)
    return map
  }, [sheets])

  const handleClick = useCallback(
    (sheetId: string) => {
      if (!onSheetSelect) return
      onSheetSelect(selectedSheetId === sheetId ? null : sheetId)
    },
    [onSheetSelect, selectedSheetId]
  )

  // Check if layout is usable — items must exist and reference valid sheets
  const hasValidLayout = layout.items.length > 0 &&
    layout.items.some(item => sheetMap.has(item.sheetId))

  if (!hasValidLayout) {
    return (
      <AutoLayout
        sheets={sheets}
        data={data}
        columns={columns}
        calculatedFields={calculatedFields}
        onSheetSelect={onSheetSelect}
        selectedSheetId={selectedSheetId}
      />
    )
  }

  const maxRow = Math.max(...layout.items.map(item => item.y + item.h))

  return (
    <div
      className="grid gap-3 w-full"
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
            className="min-w-0"
            style={{
              gridColumn: `${item.x + 1} / span ${item.w}`,
              gridRow: `${item.y + 1} / span ${item.h}`,
            }}
          >
            <SheetChart
              sheet={sheet}
              data={data}
              columns={columns}
              calculatedFields={calculatedFields}
              isSelected={selectedSheetId === sheet.id}
              onClick={onSheetSelect ? () => handleClick(sheet.id) : undefined}
              index={index}
            />
          </div>
        )
      })}
    </div>
  )
}

export default DashboardRenderer
