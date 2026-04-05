import { useState, type FC } from 'react'
import type { DataRecommendation } from '../../lib/data-review-api'

// ── Badge config per recommendation type ─────────────────────────

const BADGE_STYLES: Record<string, string> = {
  rename: 'bg-[#1C3360]/10 text-[#1C3360]',
  reclassify: 'bg-[#5B3E8A]/10 text-[#5B3E8A]',
  type_change: 'bg-[#B8860B]/10 text-[#B8860B]',
  hide: 'bg-ds-surface-alt text-ds-text-dim',
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

  const badgeStyle = BADGE_STYLES[rec.type] || BADGE_STYLES.hide
  const badgeLabel = BADGE_LABELS[rec.type] || rec.type
  const isApproved = status === 'approved'

  return (
    <div
      className={`bg-ds-surface p-4 transition-opacity duration-200 ${
        isApproved ? 'opacity-50' : 'opacity-100'
      }`}
      style={{ borderRadius: '12px', border: '0.5px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}
    >
      {/* Badge + Field name */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 ${badgeStyle}`}
          style={{ borderRadius: '4px' }}
        >
          {badgeLabel}
        </span>
        <span className="font-mono text-[10px] text-ds-text-dim truncate">
          {rec.field}
        </span>
      </div>

      {/* Change description */}
      <p className="font-sans text-xs text-ds-text leading-relaxed mb-1">
        {describeChange(rec)}
      </p>

      {/* Reason */}
      <p className="text-[11px] text-ds-text-muted leading-relaxed mb-3">
        {rec.reason}
      </p>

      {/* Actions */}
      {isApproved ? (
        <p className="font-sans text-[10px] text-ds-success uppercase tracking-wide">
          Applied ✓
        </p>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={onApprove}
            className="bg-ds-accent text-white font-sans text-[10px] uppercase tracking-wide px-4 py-1.5 hover:opacity-90 transition-opacity"
            style={{ borderRadius: '6px' }}
          >
            Approve ✓
          </button>
          <button
            onClick={onSkip}
            className="text-ds-text-dim font-sans text-[10px] uppercase tracking-wide px-4 py-1.5 hover:text-ds-text-muted transition-colors"
            style={{ borderRadius: '6px', border: '0.5px solid rgba(0,0,0,0.06)' }}
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

  const hasPending = recommendations.some(r => getStatus(r.id) === 'pending')

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 shrink-0 bg-ds-accent flex items-center justify-center mt-0.5" style={{ borderRadius: '9999px' }}>
          <span className="text-white text-[10px] font-mono font-medium">C</span>
        </div>
        <p className="font-sans text-[13px] text-ds-text leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Recommendation cards */}
      {recommendations.length > 0 && (
        <div className="space-y-3">
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

      {/* Approve All button */}
      {hasPending && recommendations.length > 1 && (
        <button
          onClick={handleApproveAll}
          className="w-full text-ds-accent font-sans text-[10px] uppercase tracking-wide px-4 py-2 hover:bg-ds-accent hover:text-white transition-colors"
          style={{ borderRadius: '10px', border: '0.5px solid rgba(0,0,0,0.10)' }}
        >
          Approve All ✓
        </button>
      )}

      {/* All handled — ready to plan */}
      {allHandled && (
        <div className="bg-ds-surface p-5 text-center space-y-3" style={{ borderRadius: '12px', border: '0.5px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-ds-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <p className="font-sans text-xs font-medium text-ds-text">
              Data looks clean
            </p>
          </div>
          <button
            onClick={onStartPlanning}
            className="bg-ds-accent text-white font-sans text-xs font-medium px-6 py-2.5 hover:bg-ds-accent-hover transition-colors inline-flex items-center gap-2"
            style={{ borderRadius: '10px' }}
          >
            Start Planning
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default RecommendationCards
