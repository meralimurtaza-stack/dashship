import { useState, type FC } from 'react'
import type { PlanSpec, SheetSpec, CalcFieldSpec, BusinessRuleGroup, PlanDelta } from '../../types/plan-spec'

interface FieldWarning {
  sheetId: string
  field: string
  message: string
}

interface PlanPanelProps {
  spec: PlanSpec
  fieldWarnings: FieldWarning[]
  isValid: boolean
  onApplyDelta: (delta: PlanDelta) => void
  onGenerate: () => void
  isGenerating?: boolean
}

const AGG_OPTIONS = ['sum', 'avg', 'count', 'count_distinct', 'min', 'max', 'none'] as const

const CHART_ICONS: Record<string, string> = {
  bar: '▊', line: '╱', area: '▓', scatter: '·:', pie: '◔', kpi: '▣', table: '☰',
}

// ── Collapsible Section ───────────────────────────────────────

const Section: FC<{
  label: string
  count?: number
  defaultOpen?: boolean
  onAdd?: () => void
  children: React.ReactNode
}> = ({ label, count, defaultOpen = true, onAdd, children }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-ds-surface-alt transition-colors"
      >
        <span className="micro-label flex items-center gap-2">
          {label}
          {count !== undefined && count > 0 && (
            <span className="font-mono text-[9px] text-ds-text-dim">({count})</span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {onAdd && (
            <span
              onClick={(e) => { e.stopPropagation(); onAdd() }}
              className="font-mono text-[9px] text-ds-accent hover:text-ds-accent-hover cursor-pointer"
            >
              + add
            </span>
          )}
          <span className="text-ds-text-dim text-[10px]">{open ? '▾' : '▸'}</span>
        </span>
      </button>
      {open && <div className="px-4 pb-3 space-y-2">{children}</div>}
    </div>
  )
}

// ── Field Pill ────────────────────────────────────────────────

const FieldPill: FC<{
  field: string
  type: 'dimension' | 'measure' | 'calculated'
  agg?: string
  onAggChange?: (agg: string) => void
  onRemove?: () => void
}> = ({ field, type, agg, onAggChange, onRemove }) => {
  const borderColor = type === 'dimension'
    ? 'border-l-ds-accent'
    : type === 'calculated'
      ? 'border-l-ds-warning'
      : 'border-l-[#534AB7]'
  const bgColor = type === 'dimension'
    ? 'bg-ds-accent/[0.06]'
    : type === 'calculated'
      ? 'bg-ds-warning/[0.06]'
      : 'bg-[#534AB7]/[0.06]'

  return (
    <span className={`inline-flex items-center gap-1 border-l-2 ${borderColor} ${bgColor} px-2 py-0.5`} style={{ borderRadius: 4 }}>
      <span className="font-mono text-[10px] text-ds-text">{field}</span>
      {agg && onAggChange && (
        <select
          value={agg}
          onChange={(e) => onAggChange(e.target.value)}
          className="font-mono text-[9px] text-ds-text-dim bg-transparent border-none outline-none cursor-pointer p-0"
        >
          {AGG_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      )}
      {onRemove && (
        <button onClick={onRemove} className="text-ds-text-dim hover:text-ds-error text-[10px] ml-0.5">×</button>
      )}
    </span>
  )
}

// ── Business Rule Card ────────────────────────────────────────

const BusinessRuleCard: FC<{
  group: BusinessRuleGroup
  onUpdate: (updates: Partial<BusinessRuleGroup>) => void
}> = ({ group, onUpdate }) => {
  const statusColor = (s: string) => {
    if (s.includes('track') || s === 'green') return 'bg-ds-success'
    if (s.includes('warn') || s === 'amber') return 'bg-ds-warning'
    return 'bg-ds-error'
  }

  return (
    <div className="bg-ds-surface p-3 space-y-1.5" style={{ border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 8 }}>
      <p className="font-mono text-xs font-medium text-ds-text">{group.name}</p>
      {group.rules.map((rule, i) => (
        <div key={i} className="flex items-start gap-2 text-[11px]">
          <span className={`w-1.5 h-1.5 mt-1 shrink-0 ${statusColor(rule.status)}`} style={{ borderRadius: '50%' }} />
          <span
            className="font-sans text-ds-text-muted cursor-text"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const newRules = [...group.rules]
              newRules[i] = { ...rule, condition: e.currentTarget.textContent || rule.condition }
              onUpdate({ rules: newRules })
            }}
          >
            {rule.condition}
          </span>
          <span className="text-ds-text-dim">→</span>
          <span
            className="font-sans text-ds-text-muted cursor-text"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const newRules = [...group.rules]
              newRules[i] = { ...rule, action: e.currentTarget.textContent || rule.action }
              onUpdate({ rules: newRules })
            }}
          >
            {rule.action}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Calc Field Card ───────────────────────────────────────────

const CalcFieldCard: FC<{
  field: CalcFieldSpec
  hasWarning: boolean
  onUpdate: (updates: Partial<CalcFieldSpec>) => void
  onRemove: () => void
}> = ({ field, hasWarning, onUpdate, onRemove }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-ds-surface" style={{ border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-ds-surface-alt transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="font-mono text-[13px] font-medium text-ds-text">{field.name}</span>
          <span className="font-mono text-[9px] uppercase tracking-wide text-ds-text-dim px-1.5 py-0.5" style={{ border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 4 }}>
            {field.type}
          </span>
          {field.lod && (
            <span className="font-mono text-[9px] uppercase tracking-wide text-ds-warning bg-ds-warning/[0.06] px-1.5 py-0.5" style={{ border: '0.5px solid rgba(184,134,11,0.3)', borderRadius: 4 }}>
              LOD
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onRemove() }} className="text-ds-text-dim hover:text-ds-error text-xs">×</button>
          <span className="text-ds-text-dim text-[10px]">{expanded ? '▾' : '▸'}</span>
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
          <div
            className="font-mono text-[11px] text-ds-text bg-ds-surface-alt p-2 mt-2 cursor-text whitespace-pre-wrap"
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => onUpdate({ formula: e.currentTarget.textContent || field.formula })}
          >
            {field.formula}
          </div>
          {field.dependsOn.length > 0 && (
            <p className="font-mono text-[11px] text-ds-text-dim">
              Uses: {field.dependsOn.join(', ')}
            </p>
          )}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 ${hasWarning ? 'bg-ds-error' : 'bg-ds-success'}`} style={{ borderRadius: '50%' }} />
            <span className="font-mono text-[10px] text-ds-text-dim">
              {hasWarning ? 'Field reference error' : 'All fields found'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sheet Card ────────────────────────────────────────────────

const SheetCard: FC<{
  sheet: SheetSpec
  calcFieldNames: string[]
  onUpdate: (updates: Partial<SheetSpec>) => void
  onRemove: () => void
}> = ({ sheet, calcFieldNames, onUpdate, onRemove }) => {
  const fieldType = (name: string): 'dimension' | 'measure' | 'calculated' => {
    if (calcFieldNames.includes(name)) return 'calculated'
    if (sheet.x?.field === name) return sheet.x.type === 'measure' ? 'measure' : 'dimension'
    if (sheet.y?.field === name) return sheet.y.type === 'measure' ? 'measure' : 'dimension'
    if (sheet.color?.field === name) return sheet.color.type === 'measure' ? 'measure' : 'dimension'
    return 'dimension'
  }

  return (
    <div className="bg-ds-surface p-3 space-y-2 group relative" style={{ border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 8 }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[13px] font-medium text-ds-text">{sheet.intent}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-ds-text-dim">{CHART_ICONS[sheet.chartType] || ''} {sheet.chartType}</span>
          <button onClick={onRemove} className="text-ds-text-dim hover:text-ds-error text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
        </div>
      </div>

      <div className="space-y-1">
        {sheet.x && (
          <div className="flex items-center gap-1.5">
            <span className="micro-label w-12">X-AXIS</span>
            <FieldPill
              field={sheet.x.field}
              type={fieldType(sheet.x.field)}
              agg={sheet.x.type === 'measure' ? (sheet.x.agg || 'none') : undefined}
              onAggChange={sheet.x.type === 'measure' ? (agg) => onUpdate({ x: { ...sheet.x!, agg: agg as any } }) : undefined}
            />
          </div>
        )}
        {sheet.y && (
          <div className="flex items-center gap-1.5">
            <span className="micro-label w-12">Y-AXIS</span>
            <FieldPill
              field={sheet.y.field}
              type={fieldType(sheet.y.field)}
              agg={sheet.y.type === 'measure' ? (sheet.y.agg || 'sum') : undefined}
              onAggChange={sheet.y.type === 'measure' ? (agg) => onUpdate({ y: { ...sheet.y!, agg: agg as any } }) : undefined}
            />
          </div>
        )}
        {sheet.color && (
          <div className="flex items-center gap-1.5">
            <span className="micro-label w-12">COLOR</span>
            <FieldPill field={sheet.color.field} type={fieldType(sheet.color.field)} />
          </div>
        )}
        {sheet.chartType === 'kpi' && sheet.metrics?.map((m, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="micro-label w-12">METRIC</span>
            <FieldPill field={m.field} type={fieldType(m.field)} agg={m.aggregation} />
          </div>
        ))}
        {sheet.chartType === 'table' && sheet.columns && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="micro-label w-12">COLS</span>
            {sheet.columns.map((col, i) => (
              <FieldPill key={i} field={col} type={fieldType(col)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main PlanPanel ────────────────────────────────────────────

const PlanPanel: FC<PlanPanelProps> = ({
  spec,
  fieldWarnings,
  isValid,
  onApplyDelta,
  onGenerate,
  isGenerating,
}) => {
  const calcFieldNames = spec.calculatedFields.map(f => f.name)
  const sheetCount = spec.sheets.length
  const calcCount = spec.calculatedFields.length

  return (
    <div className="h-full flex flex-col bg-ds-surface overflow-hidden" style={{ borderLeft: '0.5px solid rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div className="px-4 py-3 shrink-0" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-mono text-sm font-medium text-ds-text">Dashboard plan</p>
          <span
            className="font-mono text-[8px] uppercase tracking-widest px-2 py-0.5"
            style={{ color: 'var(--color-ds-warning)', background: 'rgba(184,134,11,0.06)', borderRadius: 4 }}
          >
            PLANNING
          </span>
        </div>
        <p className="font-sans text-xs text-ds-text-muted">{spec.plan.title || 'Untitled'}</p>
        <p className="font-mono text-[11px] text-ds-text-dim mt-0.5">
          {sheetCount} sheet{sheetCount !== 1 ? 's' : ''}, {calcCount} calc{calcCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Scrollable sections */}
      <div className="flex-1 overflow-y-auto">
        {/* Business rules */}
        {spec.businessRules.length > 0 && (
          <Section label="BUSINESS RULES" count={spec.businessRules.length}>
            {spec.businessRules.map((group, i) => (
              <BusinessRuleCard
                key={i}
                group={group}
                onUpdate={(updates) => onApplyDelta({ action: 'update_business_rule', name: group.name, updates })}
              />
            ))}
          </Section>
        )}

        {/* Calculated fields */}
        <Section
          label="CALCULATED FIELDS"
          count={calcCount}
          defaultOpen={calcCount > 0}
          onAdd={() => onApplyDelta({
            action: 'add_calculated_field',
            field: { name: `calc_${Date.now()}`, formula: '', type: 'measure', dependsOn: [] },
          })}
        >
          {spec.calculatedFields.length === 0 ? (
            <p className="font-sans text-[11px] text-ds-text-dim py-1">None yet</p>
          ) : (
            spec.calculatedFields.map((field, i) => (
              <CalcFieldCard
                key={i}
                field={field}
                hasWarning={fieldWarnings.some(w => field.dependsOn.includes(w.field))}
                onUpdate={(updates) => onApplyDelta({ action: 'update_calculated_field', name: field.name, updates })}
                onRemove={() => onApplyDelta({ action: 'remove_calculated_field', name: field.name })}
              />
            ))
          )}
        </Section>

        {/* Global filters */}
        {spec.globalFilters.length > 0 && (
          <Section label="GLOBAL FILTERS" count={spec.globalFilters.length}>
            <div className="flex flex-wrap gap-1.5">
              {spec.globalFilters.map((filter, i) => (
                <FieldPill
                  key={i}
                  field={filter.field}
                  type={filter.type === 'measure' ? 'measure' : 'dimension'}
                  onRemove={() => onApplyDelta({ action: 'remove_global_filter', field: filter.field })}
                />
              ))}
            </div>
          </Section>
        )}

        {/* Sheets */}
        <Section
          label="SHEETS"
          count={sheetCount}
          defaultOpen={true}
          onAdd={() => onApplyDelta({
            action: 'add_sheet',
            sheet: { id: `sheet-${Date.now()}`, intent: 'New chart', chartType: 'bar' },
          })}
        >
          {spec.sheets.length === 0 ? (
            <p className="font-sans text-[11px] text-ds-text-dim py-1">No sheets yet — chat with Captain to build your plan</p>
          ) : (
            spec.sheets.map((sheet) => (
              <SheetCard
                key={sheet.id}
                sheet={sheet}
                calcFieldNames={calcFieldNames}
                onUpdate={(updates) => onApplyDelta({ action: 'update_sheet', id: sheet.id, updates })}
                onRemove={() => onApplyDelta({ action: 'remove_sheet', id: sheet.id })}
              />
            ))
          )}
        </Section>
      </div>

      {/* Field warnings */}
      {fieldWarnings.length > 0 && (
        <div className="px-4 py-2 shrink-0" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)', background: 'rgba(193,64,61,0.04)' }}>
          <p className="font-mono text-[10px] text-ds-error">
            {fieldWarnings.length} field error{fieldWarnings.length !== 1 ? 's' : ''}
          </p>
          {fieldWarnings.slice(0, 3).map((w, i) => (
            <p key={i} className="font-sans text-[10px] text-ds-text-dim truncate">{w.message}</p>
          ))}
        </div>
      )}

      {/* Generate button */}
      <div className="px-4 py-3 shrink-0" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
        <button
          onClick={onGenerate}
          disabled={!isValid || isGenerating}
          className="w-full bg-ds-accent text-white font-mono text-[13px] font-medium py-2.5 hover:bg-ds-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ borderRadius: 10 }}
        >
          {isGenerating ? 'Generating…' : 'Generate dashboard'}
        </button>
      </div>
    </div>
  )
}

export default PlanPanel
