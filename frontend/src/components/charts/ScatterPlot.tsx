import { type FC, useMemo } from 'react'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { autoFormat } from '../../engine/formatters'
import ChartWrapper from './ChartWrapper'
import {
  AXIS_TICK_STYLE,
  GRID_COLOR,
  ANIMATION_DURATION,
  getColor,
} from './chartConfig'

interface ScatterPlotProps {
  data: Record<string, unknown>[]
  xField: string
  yField: string
  sizeField?: string
  colorField?: string
  title?: string
  showLegend?: boolean
  colors?: string[]
  loading?: boolean
}

const LEGEND_STYLE = {
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 10,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

// ── Custom Tooltip ───────────────────────────────────────────────

const ScatterTooltipContent: FC<{
  active?: boolean
  payload?: Array<{ payload: Record<string, unknown> }>
  xField: string
  yField: string
  sizeField?: string
  colorField?: string
}> = ({ active, payload, xField, yField, sizeField, colorField }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload

  return (
    <div
      className="bg-ds-surface border border-ds-border px-3 py-2"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {colorField && d[colorField] != null && (
        <p className="micro-label mb-1">
          {String(d[colorField])}
        </p>
      )}
      <p className="font-mono text-xs text-ds-text tabular-nums">
        {xField}: {autoFormat(d[xField])}
      </p>
      <p className="font-mono text-xs text-ds-text tabular-nums">
        {yField}: {autoFormat(d[yField])}
      </p>
      {sizeField && d[sizeField] != null && (
        <p className="font-mono text-xs text-ds-text-muted tabular-nums">
          {sizeField}: {autoFormat(d[sizeField])}
        </p>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────

const ScatterPlot: FC<ScatterPlotProps> = ({
  data,
  xField,
  yField,
  sizeField,
  colorField,
  title,
  showLegend = false,
  colors,
  loading,
}) => {
  // Group data by color dimension
  const groups = useMemo(() => {
    if (!colorField) return [{ name: 'All', data }]

    const map = new Map<string, Record<string, unknown>[]>()
    for (const row of data) {
      const key = String(row[colorField] ?? 'Other')
      const group = map.get(key)
      if (group) group.push(row)
      else map.set(key, [row])
    }
    return [...map.entries()].map(([name, rows]) => ({ name, data: rows }))
  }, [data, colorField])

  const sizeRange: [number, number] = sizeField ? [40, 400] : [60, 60]

  return (
    <ChartWrapper title={title} loading={loading} empty={data.length === 0}>
      <div className="px-2 pb-4 pt-1" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 4, left: 10 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={GRID_COLOR}
            />
            <XAxis
              dataKey={xField}
              type="number"
              tick={AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => autoFormat(v)}
              name={xField}
            />
            <YAxis
              dataKey={yField}
              type="number"
              tick={AXIS_TICK_STYLE}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => autoFormat(v)}
              width={60}
              name={yField}
            />
            {sizeField && (
              <ZAxis
                dataKey={sizeField}
                type="number"
                range={sizeRange}
                name={sizeField}
              />
            )}
            <Tooltip
              content={
                <ScatterTooltipContent
                  xField={xField}
                  yField={yField}
                  sizeField={sizeField}
                  colorField={colorField}
                />
              }
            />
            {showLegend && groups.length > 1 && (
              <Legend
                wrapperStyle={LEGEND_STYLE}
                iconType="circle"
                iconSize={8}
              />
            )}
            {groups.map((group, i) => (
              <Scatter
                key={group.name}
                name={group.name}
                data={group.data}
                fill={colors?.[i] ?? getColor(i)}
                fillOpacity={0.7}
                isAnimationActive={true}
                animationDuration={ANIMATION_DURATION}
                animationEasing="ease-out"
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  )
}

export default ScatterPlot
