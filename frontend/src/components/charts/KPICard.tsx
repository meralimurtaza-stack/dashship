import { type FC, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart as RechartsArea,
  Area,
} from 'recharts'
import { formatCompact, formatFieldValue } from '../../engine/formatters'
import type { FieldBinding } from '../../types/sheet'
import { ACCENT } from './chartConfig'

interface KPICardProps {
  label: string
  value: number
  format?: FieldBinding
  comparison?: {
    value: number
    label?: string
  }
  sparklineData?: number[]
  loading?: boolean
}

// ── Delta Display ────────────────────────────────────────────────

const Delta: FC<{ current: number; previous: number; label?: string }> = ({
  current,
  previous,
  label,
}) => {
  if (previous === 0) return null
  const delta = ((current - previous) / Math.abs(previous)) * 100
  const isPositive = delta > 0
  const isNeutral = delta === 0

  return (
    <div className="flex items-center gap-1.5 mt-1">
      {!isNeutral && (
        <span
          className={`text-xs font-mono tabular-nums font-medium ${
            isPositive ? 'text-accent' : 'text-danger'
          }`}
        >
          {isPositive ? '\u2191' : '\u2193'}
          {Math.abs(delta).toFixed(1)}%
        </span>
      )}
      {isNeutral && (
        <span className="text-xs font-mono tabular-nums text-gray-400">
          0.0%
        </span>
      )}
      {label && (
        <span className="text-[10px] font-mono text-gray-400">
          {label}
        </span>
      )}
    </div>
  )
}

// ── Sparkline ────────────────────────────────────────────────────

const Sparkline: FC<{ data: number[] }> = ({ data }) => {
  const chartData = useMemo(
    () => data.map((v, i) => ({ i, v })),
    [data]
  )

  return (
    <div className="h-10 mt-3 -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsArea data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <Area
            type="monotone"
            dataKey="v"
            stroke={ACCENT}
            strokeWidth={1.5}
            fill={ACCENT}
            fillOpacity={0.06}
            dot={false}
            isAnimationActive={true}
            animationDuration={300}
            animationEasing="ease-out"
          />
        </RechartsArea>
      </ResponsiveContainer>
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────

const KPISkeleton: FC = () => (
  <div className="p-5 space-y-3">
    <div className="h-2.5 w-20 bg-gray-100 animate-pulse" />
    <div className="h-8 w-28 bg-gray-100 animate-pulse" style={{ animationDelay: '0.1s' }} />
    <div className="h-2 w-16 bg-gray-100 animate-pulse" style={{ animationDelay: '0.2s' }} />
  </div>
)

// ── Main Component ───────────────────────────────────────────────

const KPICard: FC<KPICardProps> = ({
  label,
  value,
  format,
  comparison,
  sparklineData,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200" style={{ borderRadius: 2 }}>
        <KPISkeleton />
      </div>
    )
  }

  const formattedValue = format
    ? formatFieldValue(value, format)
    : formatCompact(value)

  return (
    <div className="bg-white border border-gray-200" style={{ borderRadius: 2 }}>
      <div className="p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400 leading-none">
          {label}
        </p>
        <p className="font-mono text-3xl font-semibold text-ink tabular-nums mt-2 leading-none">
          {formattedValue}
        </p>
        {comparison && (
          <Delta
            current={value}
            previous={comparison.value}
            label={comparison.label}
          />
        )}
        {sparklineData && sparklineData.length > 1 && (
          <Sparkline data={sparklineData} />
        )}
      </div>
    </div>
  )
}

export default KPICard
