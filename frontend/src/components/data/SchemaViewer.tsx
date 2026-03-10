import type { FC } from 'react'
import type { DataSchema, DataProfile, ColumnType, FieldRole } from '../../types/datasource'
import FieldRow, { formatStat } from './FieldRow'

interface SchemaViewerProps {
  schema: DataSchema
  profile: DataProfile
  showHidden: boolean
  onToggleShowHidden: () => void
  onRenameColumn: (originalName: string, displayName: string) => void
  onChangeType: (columnName: string, type: ColumnType) => void
  onChangeRole: (columnName: string, role: FieldRole) => void
  onToggleVisibility: (columnName: string) => void
}

const SchemaViewer: FC<SchemaViewerProps> = ({
  schema, profile, showHidden, onToggleShowHidden,
  onRenameColumn, onChangeType, onChangeRole, onToggleVisibility,
}) => {
  const hiddenCount = schema.columns.filter((c) => c.hidden).length
  const visibleCols = showHidden
    ? schema.columns
    : schema.columns.filter((c) => !c.hidden)

  const dimensions = visibleCols.filter((c) => c.role === 'dimension')
  const measures = visibleCols.filter((c) => c.role === 'measure')

  return (
    <div className="space-y-6">
      {/* Quality summary */}
      <div className="grid grid-cols-4 gap-px bg-gray-200">
        {[
          { label: 'Rows', value: formatStat(schema.rowCount) },
          { label: 'Columns', value: String(schema.columns.length) },
          { label: 'Complete', value: `${profile.qualitySummary.completenessPercent}%` },
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

      {/* Show hidden toggle */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={onToggleShowHidden}
          className="font-mono text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showHidden ? 'Hide hidden fields' : `Show ${hiddenCount} hidden field${hiddenCount > 1 ? 's' : ''}`}
        </button>
      )}

      {/* Dimensions */}
      {dimensions.length > 0 && (
        <div className="border border-gray-200 bg-white">
          <div className="px-4 py-3 border-b border-gray-200">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Dimensions ({dimensions.length})
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {dimensions.map((col) => (
              <FieldRow
                key={col.name}
                col={col}
                profile={profile}
                onRename={onRenameColumn}
                onChangeType={onChangeType}
                onChangeRole={onChangeRole}
                onToggleVisibility={onToggleVisibility}
              />
            ))}
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
            {measures.map((col) => (
              <FieldRow
                key={col.name}
                col={col}
                profile={profile}
                onRename={onRenameColumn}
                onChangeType={onChangeType}
                onChangeRole={onChangeRole}
                onToggleVisibility={onToggleVisibility}
              />
            ))}
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

export default SchemaViewer
