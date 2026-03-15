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
            isPositive ? 'text-ds-accent' : 'text-ds-error'
          }`}
        >
          {isPositive ? '\u2191' : '\u2193'}
          {Math.abs(delta).toFixed(1)}%
        </span>
      )}
      {isNeutral && (
        <span className="text-xs font-mono tabular-nums text-ds-text-dim">
          0.0%
        </span>
      )}
      {label && (
        <span className="text-[10px] font-mono text-ds-text-dim">
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
    <div className="h-2.5 w-20 bg-ds-surface-alt animate-pulse" />
    <div className="h-8 w-28 bg-ds-surface-alt animate-pulse" style={{ animationDelay: '0.1s' }} />
    <div className="h-2 w-16 bg-ds-surface-alt animate-pulse" style={{ animationDelay: '0.2s' }} />
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
      <div className="bg-ds-surface border border-ds-border">
        <KPISkeleton />
      </div>
    )
  }

  const formattedValue = format
    ? formatFieldValue(value, format)
    : formatCompact(value)

  return (
    <div className="bg-ds-surface border border-ds-border">
      <div className="p-5">
        <p className="micro-label leading-none">
          {label}
        </p>
        <p className="font-mono text-3xl font-medium text-ds-text tabular-nums mt-2 leading-none">
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
