import { type FC } from 'react'
import {
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts'
import { autoFormat } from '../../engine/formatters'
import ChartWrapper from './ChartWrapper'
import {
  TOOLTIP_STYLE,
  ANIMATION_DURATION,
  getColor,
} from './chartConfig'

interface PieChartProps {
  data: Record<string, unknown>[]
  nameField: string
  valueField: string
  title?: string
  donut?: boolean
  showLabels?: boolean
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

// ── Label Renderer ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderLabel = (props: any) => {
  const cx = Number(props.cx ?? 0)
  const cy = Number(props.cy ?? 0)
  const midAngle = Number(props.midAngle ?? 0)
  const outerRadius = Number(props.outerRadius ?? 0)
  const percent = Number(props.percent ?? 0)
  const name = String(props.name ?? '')
  if (percent < 0.04) return null
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 20
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? 'start' : 'end'}
      fontFamily='"IBM Plex Mono", monospace'
      fontSize={10}
      fill="#737373"
    >
      {name} {(percent * 100).toFixed(0)}%
    </text>
  )
}

// ── Donut Center Label ───────────────────────────────────────────

const DonutCenter: FC<{ data: { name: string; value: number }[] }> = ({ data }) => {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <text
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="central"
    >
      <tspan
        x="50%"
        dy="-0.4em"
        fontFamily='"IBM Plex Mono", monospace'
        fontSize={22}
        fontWeight={600}
        fill="#0E0D0D"
      >
        {autoFormat(total)}
      </tspan>
      <tspan
        x="50%"
        dy="1.6em"
        fontFamily='"IBM Plex Mono", monospace'
        fontSize={10}
        fill="#a1a1a0"
      >
        TOTAL
      </tspan>
    </text>
  )
}

// ── Main Component ───────────────────────────────────────────────

const PieChartComponent: FC<PieChartProps> = ({
  data,
  nameField,
  valueField,
  title,
  donut = false,
  showLabels = true,
  showLegend = false,
  colors,
  loading,
}) => {
  const chartData = data.map((d) => ({
    name: String(d[nameField] ?? ''),
    value: Number(d[valueField] ?? 0),
  }))

  const innerRadius = donut ? '55%' : 0

  return (
    <ChartWrapper title={title} loading={loading} empty={data.length === 0}>
      <div className="px-2 pb-4 pt-1" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius="70%"
              dataKey="value"
              nameKey="name"
              paddingAngle={1}
              label={showLabels && !donut ? renderLabel : undefined}
              isAnimationActive={true}
              animationDuration={ANIMATION_DURATION}
              animationEasing="ease-out"
              style={{ cursor: 'pointer' }}
            >
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={colors?.[i] ?? getColor(i)}
                  stroke="#fff"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            {donut && <DonutCenter data={chartData} />}
            <Tooltip
              {...TOOLTIP_STYLE}
              formatter={(value: unknown) => [autoFormat(value)]}
            />
            {showLegend && (
              <Legend
                wrapperStyle={LEGEND_STYLE}
                iconType="circle"
                iconSize={8}
              />
            )}
          </RechartsPie>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  )
}

export default PieChartComponent
