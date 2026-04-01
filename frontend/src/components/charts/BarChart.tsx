import { type FC, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts'
import { formatValue, type FormatConfig } from '../../lib/formatValue'
import ChartCard, { type ChartInfo } from './ChartCard'
import { SERIES_COLORS, AXIS_STYLE, TOOLTIP_CONFIG, GRID_STROKE } from './chartConfig'

interface BarChartProps {
  data: Record<string, unknown>[]
  categoryField: string
  valueFields: string[]
  format?: FormatConfig
  title: string
  orientation?: 'vertical' | 'horizontal'
  stacked?: boolean
  showLegend?: boolean
  showLabels?: boolean
  isSelected?: boolean
  onClick?: () => void
  index?: number
  info?: ChartInfo
}

// Custom label renderer for bar values
const renderBarLabel = (props: any, format?: FormatConfig) => {
  const { x, y, width, height, value } = props
  if (value == null || value === 0) return null

  const formatted = typeof value === 'number'
    ? formatValue(value, format ?? { type: 'compact' })
    : String(value)

  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      dominantBaseline="central"
      style={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 10,
        fill: '#0E0D0D',
      }}
    >
      {formatted}
    </text>
  )
}

const renderVerticalBarLabel = (props: any, format?: FormatConfig) => {
  const { x, y, width, value } = props
  if (value == null || value === 0) return null

  const formatted = typeof value === 'number'
    ? formatValue(value, format ?? { type: 'compact' })
    : String(value)

  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      style={{
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 10,
        fill: '#0E0D0D',
      }}
    >
      {formatted}
    </text>
  )
}

const BarChartComponent: FC<BarChartProps> = ({
  data,
  categoryField,
  valueFields,
  format,
  title,
  orientation = 'vertical',
  stacked = false,
  isSelected,
  onClick,
  index,
  info,
}) => {
  const isHorizontal = orientation === 'horizontal'

  // Calculate consistent label width for horizontal bars
  const labelWidth = useMemo(() => {
    if (!data.length || !isHorizontal) return 80
    const maxLen = Math.max(...data.map(d => String(d[categoryField] ?? '').length))
    // Clamp between 80 and 160px, ~7px per character
    return Math.max(80, Math.min(maxLen * 7, 160))
  }, [data, categoryField, isHorizontal])

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

  const chartHeight = isHorizontal
    ? Math.max(240, data.length * 36)
    : 240

  // For value labels at end of bars, add right margin
  const rightMargin = isHorizontal ? 60 : 12

  return (
    <ChartCard title={title} isSelected={isSelected} onClick={onClick} index={index} info={info}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <RechartsBar
          data={data}
          layout={isHorizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: rightMargin, bottom: 4, left: 4 }}
          barSize={isHorizontal ? 20 : 32}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={GRID_STROKE}
            vertical={!isHorizontal}
            horizontal={isHorizontal}
          />

          {isHorizontal ? (
            <>
              <YAxis
                dataKey={categoryField}
                type="category"
                tick={{
                  ...AXIS_STYLE,
                  textAnchor: 'end',
                }}
                axisLine={false}
                tickLine={false}
                width={labelWidth}
              />
              <XAxis
                type="number"
                tick={AXIS_STYLE}
                axisLine={false}
                tickLine={false}
                tickFormatter={tickFormatter}
                domain={[0, 'auto']}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={categoryField}
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
                domain={[0, 'auto']}
              />
            </>
          )}

          <Tooltip
            {...TOOLTIP_CONFIG}
            formatter={(value: unknown) => [
              typeof value === 'number' ? formatValue(value, format) : String(value),
            ]}
          />

          {valueFields.map((field, i) => (
            <Bar
              key={field}
              dataKey={field}
              fill={SERIES_COLORS[i % SERIES_COLORS.length]}
              fillOpacity={0.85}
              stackId={stacked ? 'stack' : undefined}
              radius={isHorizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]}
              isAnimationActive
              animationDuration={400}
              animationEasing="ease-out"
            >
              {/* Value labels at end of each bar */}
              {!stacked && (
                <LabelList
                  dataKey={field}
                  position={isHorizontal ? 'right' : 'top'}
                  content={(props: any) =>
                    isHorizontal
                      ? renderBarLabel(props, format)
                      : renderVerticalBarLabel(props, format)
                  }
                />
              )}
            </Bar>
          ))}
        </RechartsBar>
      </ResponsiveContainer>
    </ChartCard>
  )
}

export default BarChartComponent
