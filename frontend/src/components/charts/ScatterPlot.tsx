import { type FC, useMemo } from 'react'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ZAxis,
} from 'recharts'
import { formatValue, type FormatConfig } from '../../lib/formatValue'
import ChartCard, { type ChartInfo } from './ChartCard'
import { SERIES_COLORS, AXIS_STYLE, TOOLTIP_CONFIG, GRID_STROKE, PIE_PALETTE } from './chartConfig'

interface ScatterPlotProps {
  data: Record<string, unknown>[]
  xField: string
  yField: string
  xFormat?: FormatConfig
  yFormat?: FormatConfig
  title: string
  colorField?: string
  sizeField?: string
  showLegend?: boolean
  isSelected?: boolean
  onClick?: () => void
  index?: number
  info?: ChartInfo
}

const ScatterPlotComponent: FC<ScatterPlotProps> = ({
  data,
  xField,
  yField,
  xFormat,
  yFormat,
  title,
  colorField,
  isSelected,
  onClick,
  index,
  info,
}) => {
  // Group data by color field if provided
  const seriesData = useMemo(() => {
    if (!colorField) {
      return [{ name: 'all', data, color: SERIES_COLORS[0] }]
    }

    const groups = new Map<string, Record<string, unknown>[]>()
    for (const row of data) {
      const key = String(row[colorField] ?? '(empty)')
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(row)
    }

    const result: Array<{ name: string; data: Record<string, unknown>[]; color: string }> = []
    let i = 0
    for (const [name, rows] of groups) {
      result.push({ name, data: rows, color: PIE_PALETTE[i % PIE_PALETTE.length] })
      i++
    }
    return result
  }, [data, colorField])

  if (data.length === 0) {
    return (
      <ChartCard title={title} isSelected={isSelected} onClick={onClick} index={index} info={info}>
        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: '"Space Grotesk", monospace', fontSize: 12, color: '#8A8A86' }}>No data</span>
        </div>
      </ChartCard>
    )
  }

  const xTickFormatter = (v: unknown) => {
    if (typeof v === 'number') return formatValue(v, xFormat ?? { type: 'compact' })
    return String(v)
  }
  const yTickFormatter = (v: unknown) => {
    if (typeof v === 'number') return formatValue(v, yFormat ?? { type: 'compact' })
    return String(v)
  }

  return (
    <ChartCard title={title} isSelected={isSelected} onClick={onClick} index={index} info={info}>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={GRID_STROKE}
          />
          <XAxis
            dataKey={xField}
            type="number"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={xTickFormatter}
            name={xField}
          />
          <YAxis
            dataKey={yField}
            type="number"
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={yTickFormatter}
            width={52}
            name={yField}
          />
          <ZAxis range={[36, 36]} />
          <Tooltip
            {...TOOLTIP_CONFIG}
            formatter={(value: unknown, name: string) => [
              typeof value === 'number'
                ? formatValue(value, name === xField ? xFormat : yFormat)
                : String(value),
              name,
            ]}
          />

          {seriesData.map(series => (
            <Scatter
              key={series.name}
              name={series.name}
              data={series.data}
              fill={series.color}
              fillOpacity={0.6}
              isAnimationActive
              animationDuration={400}
              animationEasing="ease-out"
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export default ScatterPlotComponent
