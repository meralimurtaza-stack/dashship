import type { FC } from 'react'
import type { DataSource } from '../../types/datasource'

interface SourceSelectorProps {
  sources: DataSource[]
  loading: boolean
  onSelect: (source: DataSource) => void
}

const SourceSelector: FC<SourceSelectorProps> = ({ sources, loading, onSelect }) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-2 h-2 bg-gray-900 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-gray-500">
              Loading data sources...
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (sources.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 px-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            No Data Sources
          </p>
          <h2 className="font-mono text-2xl font-semibold text-ink leading-tight">
            Upload data first.
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Go to the Data tab to upload a CSV or Excel file. Once saved, you
            can start planning your dashboard here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-lg w-full space-y-6 px-6">
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Plan Dashboard
          </p>
          <h2 className="font-mono text-2xl font-semibold text-ink leading-tight">
            Choose a data source.
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Select a dataset to start planning your dashboard with AI.
          </p>
        </div>

        <div className="space-y-2">
          {sources.map((source) => {
            const dims = source.schema.columns.filter(
              (c) => c.role === 'dimension'
            ).length
            const meas = source.schema.columns.filter(
              (c) => c.role === 'measure'
            ).length

            return (
              <button
                key={source.id}
                onClick={() => onSelect(source)}
                className="w-full text-left border border-gray-200 bg-white px-4 py-3 hover:border-gray-900 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-medium text-ink">
                      {source.name}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400 mt-1 tabular-nums">
                      {source.schema.rowCount.toLocaleString()} rows &middot;{' '}
                      {dims}D {meas}M &middot;{' '}
                      {source.fileType.toUpperCase()}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-300 group-hover:text-gray-900 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default SourceSelector
