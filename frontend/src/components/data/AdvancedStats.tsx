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
    <div className="border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Advanced Statistics
        </span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${
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
        <div className="border-t border-gray-100">
          <div className="px-4 py-2 border-b border-gray-100">
            <span className="font-mono text-[9px] uppercase tracking-widest text-gray-300">
              Correlations ({significant.length})
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {significant.map((c) => (
              <div
                key={`${c.col1}-${c.col2}`}
                className="flex items-center justify-between px-4 py-2"
              >
                <span className="font-mono text-sm text-gray-600">
                  {c.col1} × {c.col2}
                </span>
                <span
                  className={`font-mono text-xs tabular-nums ${
                    Math.abs(c.correlation) > 0.7 ? 'text-ink font-medium' : 'text-gray-400'
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
