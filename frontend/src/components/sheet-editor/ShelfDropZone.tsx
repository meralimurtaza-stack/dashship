import { type FC, useCallback } from 'react'
import { useDroppable } from '@dnd-kit/core'
import type { FieldBinding } from '../../types/sheet'
import type { ShelfType } from '../../types/editor'
import { SHELF_LABELS } from '../../types/editor'

const AGGREGATIONS = ['sum', 'avg', 'count', 'min', 'max', 'none'] as const

// ── Field Pill ──────────────────────────────────────────────────

const FieldPill: FC<{
  binding: FieldBinding
  onChangeAggregation: (agg: FieldBinding['aggregation']) => void
  onRemove: () => void
}> = ({ binding, onChangeAggregation, onRemove }) => {
  const cycleAgg = useCallback(() => {
    if (binding.type !== 'measure') return
    const current = binding.aggregation || 'sum'
    const idx = AGGREGATIONS.indexOf(current as typeof AGGREGATIONS[number])
    const next = AGGREGATIONS[(idx + 1) % AGGREGATIONS.length]
    onChangeAggregation(next)
  }, [binding, onChangeAggregation])

  const isMeasure = binding.type === 'measure'

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono
        border transition-colors cursor-default select-none
        ${isMeasure ? 'bg-ds-accent-glow border-ds-accent/20 text-ds-text' : 'bg-ds-surface-alt border-ds-border text-ds-text'}
      `}
    >
      {isMeasure && binding.aggregation && binding.aggregation !== 'none' && (
        <button
          onClick={cycleAgg}
          className="text-[9px] uppercase tracking-wide text-ds-accent hover:opacity-80 font-medium cursor-pointer"
          title="Click to change aggregation"
        >
          {binding.aggregation}
        </button>
      )}
      <span className="truncate max-w-[120px]">{binding.field}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 text-ds-text-dim hover:text-ds-error transition-colors"
        aria-label={`Remove ${binding.field}`}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ── Shelf Drop Zone ─────────────────────────────────────────────

interface ShelfDropZoneProps {
  shelf: ShelfType
  binding?: FieldBinding
  bindings?: FieldBinding[]  // For tooltip (array)
  isArray?: boolean
  onUpdateBinding: (binding: FieldBinding | undefined) => void
  onUpdateBindings?: (bindings: FieldBinding[]) => void
}

const ShelfDropZone: FC<ShelfDropZoneProps> = ({
  shelf,
  binding,
  bindings,
  isArray = false,
  onUpdateBinding,
  onUpdateBindings,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `shelf-${shelf}`,
    data: { shelf },
  })

  const handleChangeAgg = useCallback(
    (agg: FieldBinding['aggregation']) => {
      if (binding) {
        onUpdateBinding({ ...binding, aggregation: agg })
      }
    },
    [binding, onUpdateBinding]
  )

  const handleRemove = useCallback(() => {
    onUpdateBinding(undefined)
  }, [onUpdateBinding])

  const handleRemoveFromArray = useCallback(
    (idx: number) => {
      if (bindings && onUpdateBindings) {
        onUpdateBindings(bindings.filter((_, i) => i !== idx))
      }
    },
    [bindings, onUpdateBindings]
  )

  const handleChangeAggInArray = useCallback(
    (idx: number, agg: FieldBinding['aggregation']) => {
      if (bindings && onUpdateBindings) {
        onUpdateBindings(bindings.map((b, i) => (i === idx ? { ...b, aggregation: agg } : b)))
      }
    },
    [bindings, onUpdateBindings]
  )

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-widest text-ds-text-dim w-16 shrink-0 text-right">
        {SHELF_LABELS[shelf]}
      </span>
      <div
        ref={setNodeRef}
        className={`
          flex-1 min-h-[32px] flex items-center flex-wrap gap-1 px-2 py-1
          border border-dashed transition-colors
          ${isOver ? 'border-ds-accent bg-ds-accent-glow' : 'border-ds-border bg-ds-surface-alt'}
        `}
      >
        {!isArray && binding && (
          <FieldPill
            binding={binding}
            onChangeAggregation={handleChangeAgg}
            onRemove={handleRemove}
          />
        )}
        {isArray && bindings?.map((b, i) => (
          <FieldPill
            key={`${b.field}-${i}`}
            binding={b}
            onChangeAggregation={(agg) => handleChangeAggInArray(i, agg)}
            onRemove={() => handleRemoveFromArray(i)}
          />
        ))}
        {!binding && (!isArray || !bindings?.length) && (
          <span className="text-[10px] font-mono text-ds-text-dim select-none">
            Drop field here
          </span>
        )}
      </div>
    </div>
  )
}

export default ShelfDropZone
