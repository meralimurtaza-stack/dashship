import { useState, type FC } from 'react'
import type { InsightData, InsightKpiItem, InsightBarItem } from '../../utils/insight-parser'

interface InsightCardProps {
  insight: InsightData
  onPin?: () => void
}

// ── KPI strip ─────────────────────────────────────────────────

const KpiStrip: FC<{ items: InsightKpiItem[] }> = ({ items }) => (
  <div className="flex gap-4">
    {items.map((item, i) => (
      <div key={i} className="flex-1 min-w-0">
        <p className="font-sans text-[10px] text-ds-text-dim uppercase tracking-wide truncate">{item.label}</p>
        <p className="font-mono text-lg font-medium text-ds-text tabular-nums">{item.value}</p>
        {item.delta && (
          <p className={`font-mono text-[11px] tabular-nums ${
            item.deltaDir === 'up' ? 'text-ds-success' : item.deltaDir === 'down' ? 'text-ds-error' : 'text-ds-text-dim'
          }`}>
            {item.delta}
          </p>
        )}
      </div>
    ))}
  </div>
)

// ── Bar chart (CSS-only) ──────────────────────────────────────

const BarMini: FC<{ items: InsightBarItem[]; title?: string }> = ({ items, title }) => {
  const max = Math.max(...items.map(d => d.value), 1)
  return (
    <div className="space-y-1.5">
      {title && <p className="font-mono text-[11px] text-ds-text-dim">{title}</p>}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="font-sans text-[11px] text-ds-text-muted w-20 truncate shrink-0 text-right">{item.label}</span>
          <div className="flex-1 h-4 bg-ds-surface-alt relative" style={{ borderRadius: 4 }}>
            <div
              className="h-full bg-ds-accent/80"
              style={{ width: `${(item.value / max) * 100}%`, borderRadius: 4 }}
            />
          </div>
          <span className="font-mono text-[10px] text-ds-text-dim tabular-nums w-16 shrink-0">
            {item.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Sparkline (inline SVG) ────────────────────────────────────

const Sparkline: FC<{ items: InsightBarItem[]; title?: string }> = ({ items, title }) => {
  if (items.length < 2) return null
  const max = Math.max(...items.map(d => d.value), 1)
  const min = Math.min(...items.map(d => d.value), 0)
  const range = max - min || 1
  const w = 200
  const h = 40
  const points = items.map((d, i) => {
    const x = (i / (items.length - 1)) * w
    const y = h - ((d.value - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="space-y-1">
      {title && <p className="font-mono text-[11px] text-ds-text-dim">{title}</p>}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="var(--color-ds-accent)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

// ── Main InsightCard ──────────────────────────────────────────

const InsightCard: FC<InsightCardProps> = ({ insight, onPin }) => {
  const [pinned, setPinned] = useState(false)

  const handlePin = () => {
    if (onPin && !pinned) {
      onPin()
      setPinned(true)
      setTimeout(() => setPinned(false), 2000)
    }
  }

  return (
    <div className="bg-ds-surface p-3.5 my-3" style={{ border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
      {insight.type === 'kpi' && <KpiStrip items={insight.data as InsightKpiItem[]} />}
      {insight.type === 'bar' && <BarMini items={insight.data as InsightBarItem[]} title={insight.title} />}
      {insight.type === 'line' && <Sparkline items={insight.data as InsightBarItem[]} title={insight.title} />}

      {onPin && (
        <div className="mt-2.5 pt-2" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
          <button
            onClick={handlePin}
            disabled={pinned}
            className="font-mono text-[11px] text-ds-text-dim hover:text-ds-accent transition-colors disabled:text-ds-success"
          >
            {pinned ? '✓ Added to plan' : '+ Pin to dashboard'}
          </button>
        </div>
      )}
    </div>
  )
}

export default InsightCard
