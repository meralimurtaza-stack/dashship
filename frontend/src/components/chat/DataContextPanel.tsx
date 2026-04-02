import { useState, type FC } from 'react'
import type { ChatDataContext } from '../../types/chat'

interface DataContextPanelProps {
  dataContext: ChatDataContext
  onCollapse: () => void
}

const DIMENSION_ICONS: Record<string, string> = {
  date: 'calendar_today',
  string: 'category',
  number: 'tag',
  boolean: 'toggle_on',
}

const DataContextPanel: FC<DataContextPanelProps> = ({
  dataContext,
  onCollapse,
}) => {
  const [expandedDims, setExpandedDims] = useState(true)
  const [expandedMeas, setExpandedMeas] = useState(true)

  const dimensions = dataContext.columns.filter((c) => c.role === 'dimension')
  const measures = dataContext.columns.filter((c) => c.role === 'measure')

  return (
    <div
      className="h-full flex flex-col p-6 space-y-8 overflow-y-auto"
      style={{
        backgroundColor: 'rgba(245,243,238,0.5)',
        borderLeft: '1px solid rgba(228,226,221,0.3)',
      }}
    >
      {/* Mission Context header */}
      <div className="flex items-center justify-between">
        <h4
          className="text-[10px] uppercase tracking-widest font-bold"
          style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-outline)' }}
        >
          Mission Context
        </h4>
        <button
          onClick={onCollapse}
          className="p-1 hover:opacity-60 transition-opacity"
          aria-label="Collapse panel"
        >
          <span className="material-symbols-outlined text-lg" style={{ color: 'var(--color-lp-outline)' }}>chevron_right</span>
        </button>
      </div>

      {/* Source card */}
      <div
        className="bg-white p-5 rounded-2xl shadow-sm border group hover:border-lp-primary transition-colors cursor-pointer"
        style={{ borderColor: 'rgba(228,226,221,0.5)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors group-hover:bg-lp-primary group-hover:text-white"
            style={{ backgroundColor: 'rgba(61,130,246,0.05)', color: 'var(--color-lp-primary)' }}
          >
            <span className="material-symbols-outlined text-xl">description</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--color-lp-on-surface)' }}>{dataContext.sourceName}</p>
            <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-outline)' }}>
              {dataContext.rowCount.toLocaleString()} Rows &bull; {dataContext.columns.length} Fields
            </p>
          </div>
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <button
          onClick={() => setExpandedDims(!expandedDims)}
          className="w-full flex justify-between items-center mb-3"
        >
          <h5 className="text-[10px] uppercase tracking-widest font-bold" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-outline)' }}>
            Dimensions
          </h5>
          <span className="material-symbols-outlined text-sm" style={{ color: 'var(--color-lp-outline)', opacity: 0.3 }}>
            {expandedDims ? 'expand_less' : 'expand_more'}
          </span>
        </button>
        {expandedDims && (
          <ul className="space-y-2">
            {dimensions.map((col) => (
              <li
                key={col.name}
                className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl text-xs hover:shadow-sm transition-all cursor-default border border-transparent hover:border-lp-primary/20"
                style={{ color: 'var(--color-lp-on-surface)' }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--color-lp-outline-variant)' }}>
                  {DIMENSION_ICONS[col.type] || 'label'}
                </span>
                <span className="truncate">{col.displayName || col.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Measures */}
      <div>
        <button
          onClick={() => setExpandedMeas(!expandedMeas)}
          className="w-full flex justify-between items-center mb-3"
        >
          <h5 className="text-[10px] uppercase tracking-widest font-bold" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-outline)' }}>
            Measures
          </h5>
          <span className="material-symbols-outlined text-sm" style={{ color: 'var(--color-lp-outline)', opacity: 0.3 }}>
            {expandedMeas ? 'expand_less' : 'expand_more'}
          </span>
        </button>
        {expandedMeas && (
          <ul className="space-y-2">
            {measures.map((col) => (
              <li
                key={col.name}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-default border"
                style={{
                  backgroundColor: 'rgba(61,130,246,0.05)',
                  color: 'var(--color-lp-primary)',
                  borderColor: 'rgba(61,130,246,0.1)',
                }}
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                <span className="truncate">{col.displayName || col.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Live Insight */}
      <div className="mt-auto pt-4">
        <div
          className="p-5 rounded-[1.5rem] shadow-sm relative overflow-hidden group"
          style={{ backgroundColor: 'var(--color-lp-tertiary-fixed)' }}
        >
          <p
            className="text-[10px] uppercase tracking-widest mb-2 font-bold relative z-10"
            style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-tertiary-fixed)' }}
          >
            Live Insight
          </p>
          <p
            className="text-sm leading-relaxed italic relative z-10"
            style={{ color: 'rgba(44,0,81,0.9)' }}
          >
            "{dimensions.length} dimensions and {measures.length} measures ready for analysis. The Captain will recommend the best visualization approach."
          </p>
          <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform" />
        </div>
      </div>
    </div>
  )
}

export default DataContextPanel
