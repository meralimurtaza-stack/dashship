import { useState, type FC } from 'react'
import type { DataProfile } from '../../types/datasource'

interface AdvancedStatsProps {
  profile: DataProfile
}

const AdvancedStats: FC<AdvancedStatsProps> = ({ profile }) => {
  const [expanded, setExpanded] = useState(false)

  const significant = profile.correlations
    .filter((c) => Math.abs(c.correlation) > 0.3)
    .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
    .slice(0, 10)

  if (significant.length === 0) return null

  return (
    <div className="bg-ds-surface overflow-hidden" style={{ borderRadius: 12, border: '0.5px solid var(--color-ds-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-ds-surface-alt transition-colors"
        style={{ borderRadius: '12px 12px 0 0' }}
      >
        <span className="micro-label">
          Advanced Statistics
        </span>
        <svg
          className={`w-3 h-3 text-ds-text-dim transition-transform duration-150 ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div style={{ borderTop: '0.5px solid var(--color-ds-border)' }}>
          <div className="px-4 py-2" style={{ borderBottom: '0.5px solid var(--color-ds-border)' }}>
            <span className="font-mono text-[9px] uppercase tracking-widest text-ds-text-dim">
              Correlations ({significant.length})
            </span>
          </div>
          <div>
            {significant.map((c) => (
              <div
                key={`${c.col1}-${c.col2}`}
                className="flex items-center justify-between px-4 py-2"
                style={{ borderBottom: '0.5px solid var(--color-ds-border)' }}
              >
                <span className="font-sans text-sm text-ds-text-muted">
                  {c.col1} × {c.col2}
                </span>
                <span
                  className={`font-mono text-xs tabular-nums ${
                    Math.abs(c.correlation) > 0.7 ? 'text-ds-text font-medium' : 'text-ds-text-dim'
                  }`}
                >
                  {c.correlation > 0 ? '+' : ''}{c.correlation.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedStats
