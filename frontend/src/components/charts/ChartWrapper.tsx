import { type FC, type ReactNode } from 'react'

interface ChartWrapperProps {
  title?: string
  subtitle?: string
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  children: ReactNode
  className?: string
}

// ── Skeleton ─────────────────────────────────────────────────────

const SkeletonBar: FC<{ width: string; height: string; delay?: string }> = ({
  width,
  height,
  delay = '0s',
}) => (
  <div
    className="bg-gray-100 animate-pulse"
    style={{ width, height, animationDelay: delay }}
  />
)

const LoadingSkeleton: FC = () => (
  <div className="p-6 space-y-4">
    <div className="space-y-2">
      <SkeletonBar width="40%" height="10px" />
      <SkeletonBar width="25%" height="8px" delay="0.1s" />
    </div>
    <div className="flex items-end gap-2 pt-4">
      <SkeletonBar width="12%" height="60%" delay="0.05s" />
      <SkeletonBar width="12%" height="80%" delay="0.1s" />
      <SkeletonBar width="12%" height="45%" delay="0.15s" />
      <SkeletonBar width="12%" height="90%" delay="0.2s" />
      <SkeletonBar width="12%" height="55%" delay="0.25s" />
      <SkeletonBar width="12%" height="70%" delay="0.3s" />
      <SkeletonBar width="12%" height="40%" delay="0.35s" />
    </div>
  </div>
)

// ── Empty State ──────────────────────────────────────────────────

const EmptyState: FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6">
    <p className="font-mono text-2xl font-semibold text-gray-300 mb-2">
      No data
    </p>
    <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
      {message ?? 'Add fields to visualise your data'}
    </p>
  </div>
)

// ── Main Component ───────────────────────────────────────────────

const ChartWrapper: FC<ChartWrapperProps> = ({
  title,
  subtitle,
  loading,
  empty,
  emptyMessage,
  children,
  className = '',
}) => {
  return (
    <div
      className={`bg-white border border-gray-200 overflow-hidden ${className}`}
      style={{ borderRadius: 2 }}
    >
      {title && (
        <div className="px-5 pt-4 pb-2">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-gray-400 leading-none">
            {title}
          </h3>
          {subtitle && (
            <p className="font-mono text-[10px] text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div className="w-full">
        {loading ? <LoadingSkeleton /> : empty ? <EmptyState message={emptyMessage} /> : children}
      </div>
    </div>
  )
}

export default ChartWrapper
