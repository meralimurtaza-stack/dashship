import { useState, type FC } from 'react'
import type { ChatDataContext } from '../../types/chat'

interface DataContextPanelProps {
  dataContext: ChatDataContext
  onCollapse: () => void
}

const FieldPill: FC<{ name: string; type: string }> = ({ name, type }) => {
  const typeColor =
    type === 'number'
      ? 'text-ds-accent'
      : type === 'date'
        ? 'text-ds-text-muted'
        : 'text-ds-text-muted'

  return (
    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-ds-surface-alt transition-colors group">
      <span className="font-mono text-xs text-ds-text truncate">{name}</span>
      <span className={`font-mono text-[10px] uppercase tracking-wide ${typeColor}`}>
        {type}
      </span>
    </div>
  )
}

const DataContextPanel: FC<DataContextPanelProps> = ({
  dataContext,
  onCollapse,
}) => {
  const [expandedSection, setExpandedSection] = useState<
    'dimensions' | 'measures' | null
  >(null)

  const dimensions = dataContext.columns.filter((c) => c.role === 'dimension')
  const measures = dataContext.columns.filter((c) => c.role === 'measure')

  const toggleSection = (section: 'dimensions' | 'measures') => {
    setExpandedSection((prev) => (prev === section ? null : section))
  }

  return (
    <div className="h-full bg-ds-surface flex flex-col" style={{ borderLeft: '0.5px solid rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
        <p className="micro-label">
          Data Context
        </p>
        <button
          onClick={onCollapse}
          className="p-1 hover:opacity-60 transition-opacity"
          aria-label="Collapse panel"
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
              d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
            />
          </svg>
        </button>
      </div>

      {/* Source info */}
      <div className="px-4 py-4 space-y-3" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
        <h3 className="font-mono text-sm font-medium text-ds-text truncate">
          {dataContext.sourceName}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="micro-label">
              Rows
            </p>
            <p className="font-mono text-sm font-medium text-ds-text tabular-nums mt-0.5">
              {dataContext.rowCount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="micro-label">
              Fields
            </p>
            <p className="font-mono text-sm font-medium text-ds-text tabular-nums mt-0.5">
              {dataContext.columns.length}
            </p>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto">
        {/* Dimensions */}
        <button
          onClick={() => toggleSection('dimensions')}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-ds-surface-alt transition-colors"
          style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-3 h-3 text-ds-text-dim transition-transform ${
                expandedSection === 'dimensions' ? 'rotate-90' : ''
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
            <span className="micro-label">
              Dimensions
            </span>
          </div>
          <span className="font-mono text-[10px] text-ds-text-dim tabular-nums">
            {dimensions.length}
          </span>
        </button>
        {expandedSection === 'dimensions' && (
          <div className="px-2 py-1" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
            {dimensions.map((col) => (
              <FieldPill
                key={col.name}
                name={col.displayName || col.name}
                type={col.type}
              />
            ))}
          </div>
        )}

        {/* Measures */}
        <button
          onClick={() => toggleSection('measures')}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-ds-surface-alt transition-colors"
          style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-3 h-3 text-ds-text-dim transition-transform ${
                expandedSection === 'measures' ? 'rotate-90' : ''
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clipRule="evenodd"
              />
            </svg>
            <span className="micro-label">
              Measures
            </span>
          </div>
          <span className="font-mono text-[10px] text-ds-text-dim tabular-nums">
            {measures.length}
          </span>
        </button>
        {expandedSection === 'measures' && (
          <div className="px-2 py-1" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
            {measures.map((col) => (
              <FieldPill
                key={col.name}
                name={col.displayName || col.name}
                type={col.type}
              />
            ))}
          </div>
        )}
      </div>

      {/* Chart types reference */}
      <div className="px-4 py-3" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
        <p className="micro-label mb-2">
          Supported Charts
        </p>
        <div className="flex flex-wrap gap-1.5">
          {['Bar', 'Line', 'Area', 'Pie', 'Scatter', 'Table', 'KPI'].map(
            (chart) => (
              <span
                key={chart}
                className="font-mono text-[10px] text-ds-text-muted bg-ds-surface-alt px-2 py-0.5"
                style={{ borderRadius: 4 }}
              >
                {chart}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export default DataContextPanel
