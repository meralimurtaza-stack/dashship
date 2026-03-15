import { type FC } from 'react'

// ── Base Shimmer ─────────────────────────────────────────────────

const Shimmer: FC<{ className?: string; delay?: string; style?: React.CSSProperties }> = ({
  className = '',
  delay = '0s',
  style,
}) => (
  <div
    className={`bg-ds-surface-alt animate-pulse ${className}`}
    style={{ animationDelay: delay, ...style }}
  />
)

// ── Chart Skeleton ───────────────────────────────────────────────

export const ChartSkeleton: FC<{ type?: 'bar' | 'line' | 'pie' }> = ({ type = 'bar' }) => (
  <div className="bg-ds-surface border border-ds-border p-5 h-full">
    {/* Title */}
    <Shimmer className="h-2 w-24 mb-1" />
    <Shimmer className="h-1.5 w-16 mb-6" delay="0.05s" />

    {/* Chart area */}
    {type === 'bar' && (
      <div className="flex items-end gap-3 h-32">
        {[60, 80, 45, 95, 55, 70, 40].map((h, i) => (
          <Shimmer
            key={i}
            className="flex-1"
            style={{ height: `${h}%` }}
            delay={`${i * 0.05}s`}
          />
        ))}
      </div>
    )}
    {type === 'line' && (
      <div className="h-32 flex flex-col justify-end gap-2">
        <Shimmer className="h-px w-full" />
        <Shimmer className="h-px w-4/5" delay="0.05s" />
        <Shimmer className="h-px w-full" delay="0.1s" />
        <Shimmer className="h-px w-3/5" delay="0.15s" />
      </div>
    )}
    {type === 'pie' && (
      <div className="flex items-center justify-center h-32">
        <Shimmer className="w-24 h-24 rounded-full" />
      </div>
    )}

    {/* X-axis labels */}
    <div className="flex gap-3 mt-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <Shimmer key={i} className="h-1.5 flex-1" delay={`${i * 0.04}s`} />
      ))}
    </div>
  </div>
)

// ── KPI Skeleton ─────────────────────────────────────────────────

export const KPISkeleton: FC = () => (
  <div className="bg-ds-surface border border-ds-border p-5">
    <Shimmer className="h-2 w-20 mb-3" />
    <Shimmer className="h-7 w-28 mb-2" delay="0.1s" />
    <Shimmer className="h-2 w-16" delay="0.2s" />
  </div>
)

// ── Table Skeleton ───────────────────────────────────────────────

export const TableSkeleton: FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 4,
}) => (
  <div className="bg-ds-surface border border-ds-border overflow-hidden">
    {/* Header */}
    <div className="flex gap-4 px-5 py-3 border-b border-ds-border">
      {Array.from({ length: cols }).map((_, i) => (
        <Shimmer key={i} className="h-2 flex-1" delay={`${i * 0.03}s`} />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 px-5 py-3 border-b border-ds-border">
        {Array.from({ length: cols }).map((_, c) => (
          <Shimmer
            key={c}
            className="h-2 flex-1"
            delay={`${(r * cols + c) * 0.02}s`}
          />
        ))}
      </div>
    ))}
  </div>
)

// ── Dashboard Skeleton (multiple cards) ──────────────────────────

export const DashboardSkeleton: FC = () => (
  <div className="p-6 space-y-6">
    {/* KPI row */}
    <div className="grid grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <KPISkeleton key={i} />
      ))}
    </div>
    {/* Chart row */}
    <div className="grid grid-cols-2 gap-4">
      <div className="h-64">
        <ChartSkeleton type="bar" />
      </div>
      <div className="h-64">
        <ChartSkeleton type="line" />
      </div>
    </div>
    {/* Table */}
    <TableSkeleton />
  </div>
)

// ── Chat Skeleton ────────────────────────────────────────────────

export const ChatSkeleton: FC = () => (
  <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : ''}`}>
        <div className={`space-y-2 ${i % 2 === 0 ? 'w-2/3' : 'w-3/4'}`}>
          <Shimmer className="h-2 w-full" delay={`${i * 0.1}s`} />
          <Shimmer className="h-2 w-4/5" delay={`${i * 0.1 + 0.05}s`} />
          {i % 2 !== 0 && <Shimmer className="h-2 w-3/5" delay={`${i * 0.1 + 0.1}s`} />}
        </div>
      </div>
    ))}
  </div>
)

// ── Data Preview Skeleton ────────────────────────────────────────

export const DataPreviewSkeleton: FC = () => (
  <div className="space-y-4">
    {/* File upload area */}
    <Shimmer className="h-40 w-full" />
    {/* Schema summary */}
    <div className="flex gap-4">
      <Shimmer className="h-16 flex-1" />
      <Shimmer className="h-16 flex-1" delay="0.05s" />
      <Shimmer className="h-16 flex-1" delay="0.1s" />
    </div>
  </div>
)
