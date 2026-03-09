import type { FC } from 'react'
import type { DataSchema, DataProfile } from '../../types/datasource'

interface SchemaViewerProps {
  schema: DataSchema
  profile: DataProfile
}

function formatStat(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2)
}

const SchemaViewer: FC<SchemaViewerProps> = ({ schema, profile }) => {
  const dimensions = schema.columns.filter((c) => c.role === 'dimension')
  const measures = schema.columns.filter((c) => c.role === 'measure')

  return (
    <div className="space-y-6">
      {/* Quality summary */}
      <div className="grid grid-cols-4 gap-px bg-gray-200">
        {[
          { label: 'Rows', value: formatStat(schema.rowCount) },
          { label: 'Columns', value: String(schema.columns.length) },
          {
            label: 'Complete',
            value: `${profile.qualitySummary.completenessPercent}%`,
          },
          { label: 'Duplicates', value: formatStat(profile.duplicateRowCount) },
        ].map((item) => (
          <div key={item.label} className="bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              {item.label}
            </p>
            <p className="font-mono text-lg font-semibold text-ink tabular-nums mt-1">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Dimensions */}
      {dimensions.length > 0 && (
        <div className="border border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-200">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Dimensions ({dimensions.length})
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {dimensions.map((col) => {
              const p = profile.columns[col.name]
              return (
                <div
                  key={col.name}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-mono text-[9px] uppercase px-1.5 py-0.5 ${
                        col.type === 'date'
                          ? 'text-gray-500 bg-gray-100'
                          : col.type === 'boolean'
                            ? 'text-gray-500 bg-gray-100'
                            : 'text-gray-500 bg-gray-100'
                      }`}
                    >
                      {col.type}
                    </span>
                    <span className="text-sm text-ink">{col.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {p?.type === 'categorical' && (
                      <span className="font-mono text-[10px] text-gray-400 tabular-nums">
                        {p.uniqueCount} unique
                      </span>
                    )}
                    {p?.type === 'date' && (
                      <span className="font-mono text-[10px] text-gray-400 tabular-nums">
                        {(p as import('../../types/datasource').DateProfile).earliest} → {(p as import('../../types/datasource').DateProfile).latest}
                      </span>
                    )}
                    {p && p.nullPercent > 0 && (
                      <span className="font-mono text-[10px] text-danger tabular-nums">
                        {p.nullPercent}% null
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Measures */}
      {measures.length > 0 && (
        <div className="border border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-200">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Measures ({measures.length})
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {measures.map((col) => {
              const p = profile.columns[col.name]
              const np = p?.type === 'numeric' ? p : null
              return (
                <div
                  key={col.name}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 text-accent bg-accent/8">
                      num
                    </span>
                    <span className="text-sm text-ink">{col.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {np && (
                      <span className="font-mono text-[10px] text-gray-400 tabular-nums">
                        {formatStat(np.min)} — {formatStat(np.max)}
                      </span>
                    )}
                    {np && (
                      <span className="font-mono text-[10px] text-gray-400 tabular-nums">
                        μ {formatStat(np.mean)}
                      </span>
                    )}
                    {p && p.nullPercent > 0 && (
                      <span className="font-mono text-[10px] text-danger tabular-nums">
                        {p.nullPercent}% null
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Correlations */}
      {profile.correlations.length > 0 && (
        <div className="border border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-200">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Correlations
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {profile.correlations
              .filter((c) => Math.abs(c.correlation) > 0.3)
              .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
              .slice(0, 10)
              .map((c) => (
                <div
                  key={`${c.col1}-${c.col2}`}
                  className="flex items-center justify-between px-4 py-2"
                >
                  <span className="text-sm text-gray-600">
                    {c.col1} × {c.col2}
                  </span>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      Math.abs(c.correlation) > 0.7
                        ? 'text-ink font-medium'
                        : 'text-gray-400'
                    }`}
                  >
                    {c.correlation > 0 ? '+' : ''}
                    {c.correlation.toFixed(2)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SchemaViewer
