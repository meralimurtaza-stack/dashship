import { type FC } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from 'recharts'
import { formatValue, type FormatConfig } from '../../lib/formatValue'
import ChartCard, { type ChartInfo } from './ChartCard'
import { SERIES_COLORS, AXIS_STYLE, TOOLTIP_CONFIG, GRID_STROKE } from './chartConfig'

interface LineChartProps {
  data: Record<string, unknown>[]
  xField: string
  yFields: string[]
  format?: FormatConfig
  title: string
  areaFill?: boolean
  smooth?: boolean
  showLegend?: boolean
  isDateAxis?: boolean
  isSelected?: boolean
  onClick?: () => void
  index?: number
  info?: ChartInfo
}

// Custom label for the final data point
const FinalValueLabel = ({ viewBox, value, color }: any) => {
  if (!viewBox || value == null) return null
  return (
    <text
      x={viewBox.x + 8}
      y={viewBox.y - 8}
      style={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 11,
        fontWeight: 500,
        fill: color || '#0E0D0D',
      }}
    >
      {value}
    </text>
  )
}

const LineChartComponent: FC<LineChartProps> = ({
  data,
  xField,
  yFields,
  format,
  title,
  areaFill = true,
  isSelected,
  onClick,
  index,
  info,
}) => {
  if (data.length === 0) {
    return (
      <ChartCard title={title} isSelected={isSelected} onClick={onClick} index={index} info={info}>
        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#8A8A86' }}>No data</span>
        </div>
      </ChartCard>
    )
  }

  const tickFormatter = (v: unknown) => {
    if (typeof v === 'number') return formatValue(v, format ?? { type: 'compact' })
    return String(v)
  }

  // Get last data point for end-of-line labels
  const lastRow = data[data.length - 1]

  return (
    <ChartCard title={title} isSelected={isSelected} onClick={onClick} index={index} info={info}>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 16, right: 56, bottom: 4, left: 4 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={GRID_STROKE}
            vertical={false}
          />
          <XAxis
            dataKey={xField}
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            tickFormatter={tickFormatter}
            width={52}
          />
          <Tooltip
            {...TOOLTIP_CONFIG}
            formatter={(value: unknown) => [
              typeof value === 'number' ? formatValue(value, format) : String(value),
            ]}
          />

          {yFields.map((field, i) => {
            const color = SERIES_COLORS[i % SERIES_COLORS.length]
            const lastValue = lastRow ? Number(lastRow[field]) : null
            const formattedLast = lastValue != null && !isNaN(lastValue)
              ? formatValue(lastValue, format ?? { type: 'compact' })
              : null

            return areaFill ? (
              <Area
                key={field}
                type="monotone"
                dataKey={field}
                stroke={color}
                strokeWidth={2}
                fill={color}
                fillOpacity={0.08}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                isAnimationActive
                animationDuration={400}
                animationEasing="ease-out"
              />
            ) : (
              <Line
                key={field}
                type="monotone"
                dataKey={field}
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                isAnimationActive
                animationDuration={400}
                animationEasing="ease-out"
              />
            )
          })}

          {/* End-of-line value dots + labels */}
          {lastRow && yFields.map((field, i) => {
            const color = SERIES_COLORS[i % SERIES_COLORS.length]
            const lastValue = Number(lastRow[field])
            if (isNaN(lastValue)) return null

            const formattedLast = formatValue(lastValue, format ?? { type: 'compact' })
            const lastX = lastRow[xField]

            return (
              <ReferenceDot
                key={`end-${field}`}
                x={lastX as any}
                y={lastValue}
                r={4}
                fill={color}
                stroke="white"
                strokeWidth={2}
                label={<FinalValueLabel value={formattedLast} color={color} />}
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export default LineChartComponent
