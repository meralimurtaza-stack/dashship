import { type FC, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart as RechartsBar,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { autoFormat } from '../../engine/formatters'
import ChartWrapper from './ChartWrapper'
import {
  AXIS_TICK_STYLE,
  TOOLTIP_STYLE,
  GRID_COLOR,
  ANIMATION_DURATION,
  ANIMATION_EASING,
  getColor,
} from './chartConfig'

interface BarChartProps {
  data: Record<string, unknown>[]
  categoryField: string
  valueFields: string[]
  title?: string
  orientation?: 'vertical' | 'horizontal'
  stacked?: boolean
  showLegend?: boolean
  showLabels?: boolean
  colors?: string[]
  loading?: boolean
}

const LEGEND_STYLE = {
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 10,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

const BarChartComponent: FC<BarChartProps> = ({
  data,
  categoryField,
  valueFields,
  title,
  orientation = 'vertical',
  stacked = false,
  showLegend = false,
  showLabels = false,
  colors,
  loading,
}) => {
  const isHorizontal = orientation === 'horizontal'
  const maxLabelLength = useMemo(() => {
    if (!data.length) return 6
    return Math.max(
      ...data.map((d) => String(d[categoryField] ?? '').length)
    )
  }, [data, categoryField])

  const leftMargin = isHorizontal ? Math.min(maxLabelLength * 6, 120) : 10

  return (
    <ChartWrapper title={title} loading={loading} empty={data.length === 0}>
      <div className="px-2 pb-4 pt-1" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBar
            data={data}
            layout={isHorizontal ? 'vertical' : 'horizontal'}
            margin={{ top: 8, right: 16, bottom: 4, left: leftMargin }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={GRID_COLOR}
              vertical={!isHorizontal}
              horizontal={isHorizontal}
            />
            {isHorizontal ? (
              <>
                <YAxis
                  dataKey={categoryField}
                  type="category"
                  tick={AXIS_TICK_STYLE}
                  axisLine={false}
                  tickLine={false}
                  width={leftMargin}
                />
                <XAxis
                  type="number"
                  tick={AXIS_TICK_STYLE}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => autoFormat(v)}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey={categoryField}
                  tick={AXIS_TICK_STYLE}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={AXIS_TICK_STYLE}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => autoFormat(v)}
                  width={60}
                />
              </>
            )}
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: unknown) => [autoFormat(value)]}
            />
            {showLegend && (
              <Legend
                wrapperStyle={LEGEND_STYLE}
                iconType="square"
                iconSize={8}
              />
            )}
            {valueFields.map((field, i) => (
              <Bar
                key={field}
                dataKey={field}
                fill={colors?.[i] ?? getColor(i)}
                stackId={stacked ? 'stack' : undefined}
                radius={stacked ? undefined : [1, 1, 0, 0]}
                isAnimationActive={true}
                animationDuration={ANIMATION_DURATION}
                animationEasing={ANIMATION_EASING}
                label={
                  showLabels
                    ? {
                        position: isHorizontal ? 'right' as const : 'top' as const,
                        style: { ...AXIS_TICK_STYLE, fontSize: 9 },
                        formatter: (v: unknown) => autoFormat(v),
                      }
                    : false
                }
              />
            ))}
          </RechartsBar>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  )
}

export default BarChartComponent
