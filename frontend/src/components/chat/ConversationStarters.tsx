import { type FC, useMemo } from 'react'
import type { ChatDataContext } from '../../types/chat'

interface ConversationStartersProps {
  dataContext: ChatDataContext
  onSend: (message: string) => void
}

const ICONS = ['monitoring', 'trending_up', 'analytics', 'bar_chart']
const COLORS = [
  'var(--color-lp-primary)',
  'var(--color-lp-tertiary)',
  'var(--color-lp-primary)',
  'var(--color-lp-secondary)',
]

const ConversationStarters: FC<ConversationStartersProps> = ({
  dataContext,
  onSend,
}) => {
  const starters = useMemo(() => {
    const dims = dataContext.columns.filter((c) => c.role === 'dimension')
    const measures = dataContext.columns.filter((c) => c.role === 'measure')
    const dateCols = dataContext.columns.filter(
      (c) => c.type === 'date' && c.role === 'dimension'
    )
    const topDim = dims[0]?.displayName || dims[0]?.name || 'category'
    const topMeasure =
      measures[0]?.displayName || measures[0]?.name || 'metric'

    const prompts: Array<{ label: string; message: string; subtitle: string }> = []

    if (dateCols.length > 0) {
      prompts.push({
        label: 'Monitoring Overall Health',
        subtitle: `${topMeasure} · Trends · Time Series`,
        message: `What trends can I see in ${topMeasure} over time?`,
      })
    }

    prompts.push({
      label: `Breakdown by ${topDim}`,
      subtitle: `${topMeasure} · ${topDim} · Segmentation`,
      message: `Show me a breakdown of ${topMeasure} by ${topDim}.`,
    })

    prompts.push({
      label: 'Performance Dashboard',
      subtitle: 'KPIs · Revenue · Growth',
      message: `Create a performance dashboard for this data highlighting the key metrics.`,
    })

    prompts.push({
      label: 'Key Metrics Deep Dive',
      subtitle: 'Dimensions · Measures · Insights',
      message: `What are the most important metrics and dimensions in this dataset?`,
    })

    return prompts.slice(0, 4)
  }, [dataContext])

  return (
    <div className="flex-1 flex flex-col justify-center px-8 md:px-12 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full space-y-12 py-12">
        {/* Welcome header */}
        <div className="space-y-5">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-lp-tertiary-fixed)', color: 'var(--color-lp-on-tertiary-fixed)' }}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ fontFamily: 'var(--font-label)' }}>AI Consultant Online</span>
          </div>
          <h2
            className="text-5xl md:text-6xl font-light leading-[0.95] tracking-tight"
            style={{ fontFamily: 'var(--font-headline)', color: 'var(--color-lp-on-surface)' }}
          >
            Let's build your <span className="italic font-light">vision.</span>
          </h2>
          <p className="text-lg max-w-xl leading-relaxed" style={{ color: 'var(--color-lp-on-surface-variant)' }}>
            {dataContext.sourceName} &middot;{' '}
            <span className="tabular-nums">{dataContext.rowCount.toLocaleString()}</span> rows &middot;{' '}
            <span className="tabular-nums">{dataContext.columns.length}</span> fields loaded. What should we build?
          </p>
        </div>

        {/* Suggestion Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {starters.map((starter, i) => (
            <button
              key={starter.label}
              onClick={() => onSend(starter.message)}
              className="text-left p-7 transition-all duration-300 rounded-[1.5rem] ring-1 hover:shadow-xl flex flex-col justify-between h-48 group"
              style={{
                backgroundColor: 'var(--color-lp-surface-container-low)',
                ringColor: `${COLORS[i]}10`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#ffffff' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-lp-surface-container-low)' }}
            >
              <div
                className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ring-1"
                style={{ color: COLORS[i], ringColor: `${COLORS[i]}20` }}
              >
                <span className="material-symbols-outlined text-2xl">{ICONS[i]}</span>
              </div>
              <div>
                <h3 className="text-xl mb-1" style={{ fontFamily: 'var(--font-headline)', color: 'var(--color-lp-on-surface)' }}>
                  {starter.label}
                </h3>
                <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>
                  {starter.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ConversationStarters
