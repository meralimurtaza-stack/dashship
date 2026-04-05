import { type FC, useMemo } from 'react'
import type { ChatDataContext } from '../../types/chat'

interface ConversationStartersProps {
  dataContext: ChatDataContext
  onSend: (message: string) => void
}

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

    const prompts: Array<{ label: string; message: string }> = []

    if (dateCols.length > 0) {
      prompts.push({
        label: 'Trends over time',
        message: `What trends can I see in ${topMeasure} over time?`,
      })
    }

    prompts.push({
      label: `Breakdown by ${topDim}`,
      message: `Show me a breakdown of ${topMeasure} by ${topDim}.`,
    })

    prompts.push({
      label: 'Performance dashboard',
      message: `Create a performance dashboard for this data highlighting the key metrics.`,
    })

    prompts.push({
      label: 'Key metrics',
      message: `What are the most important metrics and dimensions in this dataset?`,
    })

    return prompts.slice(0, 4)
  }, [dataContext])

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-lg w-full space-y-8 px-6">
        <div className="space-y-3">
          <p className="micro-label">
            Start Planning
          </p>
          <h2 className="font-mono text-2xl font-medium text-ds-text leading-tight">
            What would you like to<br />build with this data?
          </h2>
          <p className="text-sm text-ds-text-muted leading-relaxed">
            {dataContext.sourceName} &middot;{' '}
            <span className="tabular-nums font-mono">
              {dataContext.rowCount.toLocaleString()}
            </span>{' '}
            rows &middot;{' '}
            <span className="tabular-nums font-mono">
              {dataContext.columns.length}
            </span>{' '}
            fields
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {starters.map((starter) => (
            <button
              key={starter.label}
              onClick={() => onSend(starter.message)}
              className="text-left bg-ds-surface px-4 py-3 hover:border-ds-accent transition-colors group"
              style={{ border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}
            >
              <p className="font-mono text-xs font-medium text-ds-text group-hover:text-ds-text">
                {starter.label}
              </p>
              <p className="text-[11px] text-ds-text-dim mt-1 leading-relaxed line-clamp-2">
                {starter.message}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ConversationStarters
