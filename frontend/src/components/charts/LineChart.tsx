import { type FC } from 'react'
import {
  ResponsiveContainer,
  LineChart as RechartsLine,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
} from 'recharts'
import { autoFormat, formatDate } from '../../engine/formatters'
import ChartWrapper from './ChartWrapper'
import {
  AXIS_TICK_STYLE,
  TOOLTIP_STYLE,
  GRID_COLOR,
  ANIMATION_DURATION,
  ANIMATION_EASING,
  getColor,
} from './chartConfig'

interface LineChartProps {
  data: Record<string, unknown>[]
  xField: string
  yFields: string[]
  title?: string
  areaFill?: boolean
  smooth?: boolean
  showDots?: boolean
  showLegend?: boolean
  isDateAxis?: boolean
  dateFormat?: string
  colors?: string[]
  loading?: boolean
}

const LEGEND_STYLE = {
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 10,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

const LineChartComponent: FC<LineChartProps> = ({
  data,
  xField,
  yFields,
  title,
  areaFill = false,
  smooth = true,
  showDots = false,
  showLegend = false,
  isDateAxis = false,
  dateFormat = 'MMM yyyy',
  colors,
  loading,
}) => {
  const curveType = smooth ? 'monotone' : 'linear'

  const tickFormatter = isDateAxis
    ? (v: string) => formatDate(v, dateFormat)
    : (v: unknown) => String(v)

  // Use ComposedChart when area fill is needed, otherwise LineChart
  const ChartComponent = areaFill ? ComposedChart : RechartsLine

  return (
    <ChartWrapper title={title} loading={loading} empty={data.length === 0}>
      <div className="px-2 pb-4 pt-1" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={data}
            margin={{ top: 8, right: 16, bottom: 4, left: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={GRID_COLOR}
              vertical={false}
            />
            <XAxis
              dataKey={xField}
              tick={AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              tickFormatter={tickFormatter}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => autoFormat(v)}
              width={60}
            />
            <Tooltip
              {...TOOLTIP_STYLE}
              labelFormatter={isDateAxis ? (l) => formatDate(String(l), 'dd MMM yyyy') : undefined}
              formatter={(value: unknown) => [autoFormat(value)]}
            />
            {showLegend && (
              <Legend
                wrapperStyle={LEGEND_STYLE}
                iconType="line"
                iconSize={12}
              />
            )}
            {yFields.map((field, i) => {
              const color = colors?.[i] ?? getColor(i)

              if (areaFill) {
                return (
                  <Area
                    key={field}
                    type={curveType}
                    dataKey={field}
                    stroke={color}
                    strokeWidth={2}
                    fill={color}
                    fillOpacity={0.06}
                    dot={showDots ? { r: 3, fill: color, strokeWidth: 0 } : false}
                    activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }}
                    isAnimationActive={true}
                    animationDuration={ANIMATION_DURATION}
                    animationEasing={ANIMATION_EASING}
                  />
                )
              }

              return (
                <Line
                  key={field}
                  type={curveType}
                  dataKey={field}
                  stroke={color}
                  strokeWidth={2}
                  dot={showDots ? { r: 3, fill: color, strokeWidth: 0 } : false}
                  activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }}
                  isAnimationActive={true}
                  animationDuration={ANIMATION_DURATION}
                  animationEasing={ANIMATION_EASING}
                />
              )
            })}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  )
}

export default LineChartComponent
