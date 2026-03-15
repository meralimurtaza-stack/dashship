import { useState, type FC } from 'react'
import type { GeneratedDashboard } from '../lib/generate-api'
import DashboardRenderer from '../components/dashboard/DashboardRenderer'

interface DashboardPageProps {
  dashboard: GeneratedDashboard | null
  data: Record<string, unknown>[]
  onBackToChat?: () => void
}

// ── Empty State ──────────────────────────────────────────────────

const EmptyDashboard: FC<{ onBackToChat?: () => void }> = ({ onBackToChat }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="max-w-md text-center space-y-4 px-6">
      <p className="font-mono text-[10px] uppercase tracking-widest text-ds-text-dim">
        Dashboards
      </p>
      <h2 className="font-mono text-2xl font-medium text-ds-text leading-tight">
        No dashboard yet.
      </h2>
      <p className="text-sm text-ds-text-muted leading-relaxed">
        Chat with Captain to plan your analysis, then generate a dashboard from
        the conversation.
      </p>
      {onBackToChat && (
        <button
          onClick={onBackToChat}
          className="inline-flex items-center gap-2 bg-ds-accent text-white font-mono text-xs uppercase tracking-wide px-6 py-3 hover:bg-ds-accent-hover transition-colors mt-2"
          style={{ borderRadius: 2 }}
        >
          Start Planning
        </button>
      )}
    </div>
  </div>
)

// ── Main Page ────────────────────────────────────────────────────

const DashboardPage: FC<DashboardPageProps> = ({
  dashboard,
  data,
  onBackToChat,
}) => {
  console.log('[DashboardPage] dashboard:', dashboard?.name, '| sheets:', dashboard?.sheets.length ?? 0, '| data rows:', data.length)

  const [name, setName] = useState(dashboard?.name ?? 'Untitled Dashboard')
  const [isEditingName, setIsEditingName] = useState(false)

  if (!dashboard || !dashboard.sheets.length) {
    return (
      <div className="h-full flex flex-col">
        <EmptyDashboard onBackToChat={onBackToChat} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-ds-border bg-ds-surface shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBackToChat && (
            <button
              onClick={onBackToChat}
              className="p-1 hover:opacity-60 transition-opacity"
              aria-label="Back to chat"
            >
              <svg
                className="w-4 h-4 text-ds-text-dim"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
            </button>
          )}
          <div>
            {isEditingName ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                className="font-mono text-lg font-medium text-ds-text bg-transparent border-b border-ds-border-strong focus:border-ds-accent outline-none px-0 py-0.5"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="font-mono text-lg font-medium text-ds-text hover:opacity-60 transition-opacity"
              >
                {name}
              </button>
            )}
            <p className="font-mono text-[10px] text-ds-text-dim mt-0.5 tabular-nums">
              {dashboard.sheets.length} charts &middot;{' '}
              {data.length.toLocaleString()} rows
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="font-mono text-[10px] uppercase tracking-wide text-ds-text-dim hover:text-ds-text px-3 py-1.5 border border-ds-border hover:border-ds-accent transition-colors"

            disabled
          >
            Edit
          </button>
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="flex-1 p-6 overflow-auto bg-ds-bg">
        <DashboardRenderer
          layout={dashboard.layout}
          sheets={dashboard.sheets}
          data={data}
        />
      </div>
    </div>
  )
}

export default DashboardPage
