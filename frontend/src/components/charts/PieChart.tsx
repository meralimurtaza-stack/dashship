import { type FC, useState, useCallback } from 'react'
import {
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Sector,
} from 'recharts'
import { formatValue, type FormatConfig } from '../../lib/formatValue'
import ChartCard, { type ChartInfo } from './ChartCard'
import { PIE_PALETTE } from './chartConfig'

interface PieChartProps {
  data: Record<string, unknown>[]
  nameField: string
  valueField: string
  format?: FormatConfig
  title: string
  showLegend?: boolean
  showLabels?: boolean
  isSelected?: boolean
  onClick?: () => void
  index?: number
  info?: ChartInfo
}

const RADIAN = Math.PI / 180

// ── Outside label with connector line ───────────────────────────
const renderCustomLabel = (props: any) => {
  const {
    cx, cy, midAngle, innerRadius, outerRadius, name, value,
    index: _idx, percent,
  } = props

  // Skip tiny slices (< 3%)
  if (percent < 0.03) return null

  const sin = Math.sin(-RADIAN * midAngle)
  const cos = Math.cos(-RADIAN * midAngle)

  // Start point on outer edge of pie
  const sx = cx + outerRadius * cos
  const sy = cy + outerRadius * sin

  // Middle point (connector elbow)
  const mx = cx + (outerRadius + 14) * cos
  const my = cy + (outerRadius + 14) * sin

  // End point (label anchor)
  const ex = mx + (cos >= 0 ? 1 : -1) * 16
  const ey = my

  const textAnchor = cos >= 0 ? 'start' : 'end'

  return (
    <g>
      {/* Connector line */}
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke="#8A8A86"
        fill="none"
        strokeWidth={1}
      />
      {/* Dot at end of connector */}
      <circle cx={ex} cy={ey} r={2} fill="#8A8A86" />
      {/* Label: "Name: Value" */}
      <text
        x={ex + (cos >= 0 ? 5 : -5)}
        y={ey}
        textAnchor={textAnchor}
        dominantBaseline="central"
        style={{
          fontFamily: '"Space Grotesk", monospace',
          fontSize: 11,
          fill: '#1b1c19',
        }}
      >
        {name}: {typeof value === 'number' ? value.toLocaleString() : value}
      </text>
    </g>
  )
}

// ── Active shape on hover — expanded slice ──────────────────────
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill,
  } = props

  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 4}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      fillOpacity={1}
    />
  )
}

const PieChartComponent: FC<PieChartProps> = ({
  data,
  nameField,
  valueField,
  format,
  title,
  isSelected,
  onClick,
  index,
  info,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)

  const onPieEnter = useCallback((_: unknown, idx: number) => setActiveIndex(idx), [])
  const onPieLeave = useCallback(() => setActiveIndex(undefined), [])

  // Prepare data with name/value keys for Recharts
  const chartData = data.map(row => ({
    name: String(row[nameField] ?? ''),
    value: Number(row[valueField] ?? 0),
  }))

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  if (chartData.length === 0) {
    return (
      <ChartCard title={title} isSelected={isSelected} onClick={onClick} index={index} info={info}>
        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: '"Space Grotesk", monospace', fontSize: 12, color: '#8A8A86' }}>No data</span>
        </div>
      </ChartCard>
    )
  }

  const formattedTotal = format
    ? formatValue(total, format)
    : total.toLocaleString()

  return (
    <ChartCard title={title} isSelected={isSelected} onClick={onClick} index={index} info={info}>
      <ResponsiveContainer width="100%" height={240}>
        <RechartsPie>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius="42%"
            outerRadius="62%"
            paddingAngle={2}
            dataKey="value"
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            label={renderCustomLabel}
            labelLine={false}
            isAnimationActive
            animationDuration={400}
            animationEasing="ease-out"
          >
            {chartData.map((_, i) => (
              <Cell
                key={i}
                fill={PIE_PALETTE[i % PIE_PALETTE.length]}
                fillOpacity={activeIndex !== undefined && activeIndex !== i ? 0.45 : 0.85}
                stroke="none"
              />
            ))}
          </Pie>

          {/* Center total label */}
          <text
            x="50%"
            y="46%"
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontFamily: '"Manrope", system-ui, sans-serif',
              fontSize: 20,
              fontWeight: 500,
              fill: '#1b1c19',
            }}
          >
            {formattedTotal}
          </text>
          <text
            x="50%"
            y="56%"
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              fontFamily: '"Space Grotesk", monospace',
              fontSize: 9,
              fill: '#8A8A86',
              textTransform: 'uppercase' as any,
              letterSpacing: '0.05em',
            }}
          >
            TOTAL
          </text>
        </RechartsPie>
      </ResponsiveContainer>

      {/* Custom legend */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 14px',
          marginTop: 4,
        }}
      >
        {chartData.map((item, i) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'
          return (
            <div
              key={item.name}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: PIE_PALETTE[i % PIE_PALETTE.length],
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: '"Space Grotesk", monospace',
                  fontSize: 11,
                  color: '#8A8A86',
                }}
              >
                {item.name} · {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </ChartCard>
  )
}

export default PieChartComponent
