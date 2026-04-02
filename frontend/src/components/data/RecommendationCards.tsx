import { useState, type FC } from 'react'
import type { DataRecommendation } from '../../lib/data-review-api'

// ── Badge config per recommendation type ─────────────────────────

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  rename: { bg: 'rgba(61,130,246,0.1)', text: 'var(--color-lp-primary)' },
  reclassify: { bg: 'rgba(129,39,207,0.1)', text: 'var(--color-lp-tertiary)' },
  type_change: { bg: 'rgba(184,134,11,0.1)', text: '#B8860B' },
  hide: { bg: 'rgba(114,119,133,0.1)', text: 'var(--color-lp-outline)' },
}

const BADGE_LABELS: Record<string, string> = {
  rename: 'Rename',
  reclassify: 'Reclassify',
  type_change: 'Type',
  hide: 'Hide',
}

function describeChange(rec: DataRecommendation): string {
  switch (rec.type) {
    case 'rename':
      return `Rename '${rec.field}' → '${rec.to}'`
    case 'reclassify':
      return `Reclassify from ${rec.from_role} → ${rec.to_role}`
    case 'type_change':
      return `Change type from ${rec.from_type} → ${rec.to_type}`
    case 'hide':
      return `Hide '${rec.field}' from analysis`
    default:
      return rec.reason
  }
}

// ── Single Card ──────────────────────────────────────────────────

interface CardProps {
  rec: DataRecommendation
  status: 'pending' | 'approved' | 'skipped'
  onApprove: () => void
  onSkip: () => void
}

const Card: FC<CardProps> = ({ rec, status, onApprove, onSkip }) => {
  if (status === 'skipped') return null

  const badge = BADGE_COLORS[rec.type] || BADGE_COLORS.hide
  const badgeLabel = BADGE_LABELS[rec.type] || rec.type
  const isApproved = status === 'approved'

  return (
    <div
      className={`p-4 rounded-xl border transition-all duration-200 ${
        isApproved ? 'opacity-50' : 'opacity-100'
      }`}
      style={{
        backgroundColor: 'white',
        borderColor: 'rgba(194,198,214,0.2)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Badge + Field name */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded"
          style={{ fontFamily: 'var(--font-label)', backgroundColor: badge.bg, color: badge.text }}
        >
          {badgeLabel}
        </span>
        <span
          className="text-[10px] truncate"
          style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-outline)' }}
        >
          {rec.field}
        </span>
      </div>

      {/* Change description */}
      <p className="text-xs leading-relaxed mb-1" style={{ color: 'var(--color-lp-on-surface)' }}>
        {describeChange(rec)}
      </p>

      {/* Reason */}
      <p className="text-[11px] leading-relaxed mb-3" style={{ color: 'var(--color-lp-on-surface-variant)' }}>
        {rec.reason}
      </p>

      {/* Actions */}
      {isApproved ? (
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm" style={{ color: '#2E7D5B' }}>check_circle</span>
          <p className="text-[10px] uppercase tracking-wider font-bold" style={{ fontFamily: 'var(--font-label)', color: '#2E7D5B' }}>
            Applied
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={onApprove}
            className="text-white text-[10px] uppercase tracking-wider font-bold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
            style={{ fontFamily: 'var(--font-label)', backgroundColor: 'var(--color-lp-primary)' }}
          >
            Approve
          </button>
          <button
            onClick={onSkip}
            className="text-[10px] uppercase tracking-wider px-4 py-1.5 rounded-lg border hover:bg-white transition-colors"
            style={{
              fontFamily: 'var(--font-label)',
              color: 'var(--color-lp-outline)',
              borderColor: 'rgba(194,198,214,0.3)',
            }}
          >
            Skip
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────

interface RecommendationCardsProps {
  summary: string
  recommendations: DataRecommendation[]
  onApprove: (rec: DataRecommendation) => void
  onSkip: (recId: string) => void
  onApproveAll: () => void
  onStartPlanning: () => void
  allHandled: boolean
}

const RecommendationCards: FC<RecommendationCardsProps> = ({
  summary,
  recommendations,
  onApprove,
  onSkip,
  onApproveAll,
  onStartPlanning,
  allHandled,
}) => {
  const [statuses, setStatuses] = useState<Record<string, 'pending' | 'approved' | 'skipped'>>({})

  const getStatus = (id: string) => statuses[id] || 'pending'

  const handleApprove = (rec: DataRecommendation) => {
    setStatuses(prev => ({ ...prev, [rec.id]: 'approved' }))
    onApprove(rec)
  }

  const handleSkip = (recId: string) => {
    setStatuses(prev => ({ ...prev, [recId]: 'skipped' }))
    onSkip(recId)
  }

  const handleApproveAll = () => {
    const updated: Record<string, 'approved'> = {}
    for (const rec of recommendations) {
      if (getStatus(rec.id) === 'pending') {
        updated[rec.id] = 'approved'
      }
    }
    setStatuses(prev => ({ ...prev, ...updated }))
    onApproveAll()
  }

  const pendingRecs = recommendations.filter(r => getStatus(r.id) === 'pending')
  const hasPending = pendingRecs.length > 0
  const hasNoRecs = recommendations.length === 0

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* Summary bubble */}
      <div className="flex items-start gap-3">
        <div
          className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5"
          style={{ backgroundColor: 'var(--color-lp-primary)' }}
        >
          <span className="text-white text-[10px] font-bold" style={{ fontFamily: 'var(--font-label)' }}>C</span>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-lp-on-surface)' }}>
          {summary}
        </p>
      </div>

      {/* No recommendations — data is clean */}
      {hasNoRecs && (
        <div
          className="p-5 rounded-xl border text-center space-y-3"
          style={{ backgroundColor: 'white', borderColor: 'rgba(194,198,214,0.15)' }}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg" style={{ color: '#2E7D5B' }}>verified</span>
            <p className="text-xs font-medium">Data looks clean</p>
          </div>
          <button
            onClick={onStartPlanning}
            className="text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-all inline-flex items-center gap-2"
            style={{ fontFamily: 'var(--font-body)', backgroundColor: 'var(--color-lp-primary)' }}
          >
            Start Planning
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      )}

      {/* Approve All bar — pinned at top when there are pending recs */}
      {hasPending && recommendations.length > 1 && (
        <button
          onClick={handleApproveAll}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border text-xs uppercase tracking-widest font-bold transition-all hover:text-white"
          style={{
            fontFamily: 'var(--font-label)',
            color: 'var(--color-lp-primary)',
            borderColor: 'var(--color-lp-primary)',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-lp-primary)'
            e.currentTarget.style.color = 'white'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--color-lp-primary)'
          }}
        >
          <span className="material-symbols-outlined text-sm">done_all</span>
          Approve All ({pendingRecs.length})
        </button>
      )}

      {/* Scrollable recommendation list */}
      {recommendations.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1" style={{ maxHeight: 'calc(100vh - 420px)' }}>
          {recommendations.map(rec => (
            <Card
              key={rec.id}
              rec={rec}
              status={getStatus(rec.id)}
              onApprove={() => handleApprove(rec)}
              onSkip={() => handleSkip(rec.id)}
            />
          ))}
        </div>
      )}

      {/* All handled — ready to plan */}
      {allHandled && !hasNoRecs && (
        <div
          className="p-5 rounded-xl border text-center space-y-3"
          style={{ backgroundColor: 'white', borderColor: 'rgba(194,198,214,0.15)' }}
        >
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg" style={{ color: '#2E7D5B' }}>verified</span>
            <p className="text-xs font-medium">Data looks clean</p>
          </div>
          <button
            onClick={onStartPlanning}
            className="text-white text-xs font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-all inline-flex items-center gap-2"
            style={{ fontFamily: 'var(--font-body)', backgroundColor: 'var(--color-lp-primary)' }}
          >
            Start Planning
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default RecommendationCards
