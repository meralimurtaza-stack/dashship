/**
 * components/plan/PlanSidebar.tsx
 *
 * Right sidebar for PLAN tab. Shows Captain's proposed plan
 * with interactive approval for calculations and filters.
 *
 * Items flow in from Captain's plan_delta → appear as pending →
 * user approves/skips → approved items go to generation.
 *
 * Matches the Broadsheet Terminal design system.
 */

import { useState, useCallback, type FC } from 'react';
import type {
  PlanDelta,
  PlanKPI,
  PlanChart,
  PlanCalculatedField,
  PlanFilter,
} from '../../utils/plan-parser';
import type { ChatDataContext } from '../../types/chat';

// ── Approval state ──────────────────────────────────────────────

export interface ApprovalState {
  approved: Set<string>;
  skipped: Set<string>;
}

// ── Approve / Skip buttons ──────────────────────────────────────

const ApproveSkipButtons: FC<{
  id: string;
  approvals: ApprovalState;
  onApprove: (id: string) => void;
  onSkip: (id: string) => void;
}> = ({ id, approvals, onApprove, onSkip }) => {
  if (approvals.approved.has(id)) {
    return (
      <span
        className="font-mono text-[9px] px-1.5 py-0.5 shrink-0"
        style={{
          color: '#27500A',
          background: '#EAF3DE',
          border: '0.4px solid #3B6D11',
          borderRadius: 3,
        }}
      >
        Approved
      </span>
    );
  }

  if (approvals.skipped.has(id)) {
    return (
      <span className="font-mono text-[9px] shrink-0" style={{ color: '#9C9A92' }}>
        Skipped
      </span>
    );
  }

  return (
    <div className="flex gap-1 shrink-0">
      <button
        onClick={() => onApprove(id)}
        className="font-mono text-[9px] px-1.5 py-0.5 cursor-pointer hover:opacity-80"
        style={{
          color: '#085041',
          background: '#E1F5EE',
          border: '0.4px solid #0F6E56',
          borderRadius: 3,
        }}
      >
        Approve
      </button>
      <button
        onClick={() => onSkip(id)}
        className="font-mono text-[9px] px-1.5 py-0.5 cursor-pointer hover:opacity-80"
        style={{
          color: '#9C9A92',
          background: 'transparent',
          border: '0.4px solid #D3D1C7',
          borderRadius: 3,
        }}
      >
        Skip
      </button>
    </div>
  );
};

// ── Calculation card ────────────────────────────────────────────

const CalcCard: FC<{
  calc: PlanCalculatedField;
  approvals: ApprovalState;
  onApprove: (id: string) => void;
  onSkip: (id: string) => void;
}> = ({ calc, approvals, onApprove, onSkip }) => {
  const isApproved = approvals.approved.has(calc.id);
  const isSkipped = approvals.skipped.has(calc.id);

  const cardBg = isApproved ? '#EAF3DE' : isSkipped ? '#F5F4ED' : '#FAEEDA';
  const cardBorder = isApproved ? '#3B6D11' : isSkipped ? '#D3D1C7' : '#854F0B';
  const nameColor = isApproved ? '#27500A' : isSkipped ? '#9C9A92' : '#854F0B';
  const formulaBg = isApproved
    ? 'rgba(59,109,17,0.08)'
    : isSkipped
      ? 'rgba(0,0,0,0.03)'
      : 'rgba(133,79,11,0.07)';
  const formulaColor = isApproved ? '#27500A' : isSkipped ? '#9C9A92' : '#633806';

  return (
    <div
      className="p-2 mb-1.5"
      style={{
        background: cardBg,
        border: `0.4px solid ${cardBorder}`,
        borderRadius: 5,
        opacity: isSkipped ? 0.45 : 1,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="font-mono text-[11px] font-medium"
          style={{
            color: nameColor,
            textDecoration: isSkipped ? 'line-through' : 'none',
          }}
        >
          {calc.name}
        </span>
        <ApproveSkipButtons
          id={calc.id}
          approvals={approvals}
          onApprove={onApprove}
          onSkip={onSkip}
        />
      </div>
      <div
        className="font-mono text-[10px] px-1.5 py-0.5 mt-1 inline-block"
        style={{
          background: formulaBg,
          borderRadius: 3,
          color: formulaColor,
        }}
      >
        {calc.formula}
      </div>
      {calc.resultType && (
        <div className="font-mono text-[9px] mt-0.5" style={{ color: '#73726C' }}>
          Returns: {calc.resultType}
        </div>
      )}
    </div>
  );
};

// ── Filter card ─────────────────────────────────────────────────

const FilterCard: FC<{
  filter: PlanFilter;
  index: number;
  approvals: ApprovalState;
  onApprove: (id: string) => void;
  onSkip: (id: string) => void;
}> = ({ filter, index, approvals, onApprove, onSkip }) => {
  const id = `filter_${index}`;
  const isSkipped = approvals.skipped.has(id);

  const typeLabels: Record<string, string> = {
    date_range: 'Date range picker',
    multi_select: 'Multi-select pills',
    single_select: 'Single-select dropdown',
    search: 'Searchable dropdown',
  };

  return (
    <div
      className="flex items-center justify-between gap-2 px-2 py-1.5 mb-1"
      style={{
        background: isSkipped ? '#F5F4ED' : '#F1EFE8',
        border: `0.3px solid ${isSkipped ? '#D3D1C7' : 'rgba(31,30,29,0.15)'}`,
        borderRadius: 4,
        opacity: isSkipped ? 0.5 : 1,
      }}
    >
      <div className="min-w-0">
        <span
          className="font-mono text-[10px] block"
          style={{ color: isSkipped ? '#9C9A92' : '#3D3D3A' }}
        >
          {filter.field}
        </span>
        <span className="font-mono text-[9px] block" style={{ color: '#9C9A92' }}>
          {typeLabels[filter.type] || filter.type}
        </span>
      </div>
      <ApproveSkipButtons
        id={id}
        approvals={approvals}
        onApprove={onApprove}
        onSkip={onSkip}
      />
    </div>
  );
};

// ── Chart/KPI row ───────────────────────────────────────────────

function typeLabel(chart: PlanChart): string {
  if (chart.markType === 'bar' && chart.config?.orientation === 'horizontal') return 'h-bar';
  return chart.markType;
}

const SheetRow: FC<{
  name: string;
  type: string;
  encoding?: string;
  isNew?: boolean;
}> = ({ name, type, encoding, isNew }) => (
  <div
    className="px-2 py-1.5 mb-1"
    style={{
      background: isNew ? '#FAECE7' : '#F5F4ED',
      border: `0.3px solid ${isNew ? '#993C1D' : 'rgba(31,30,29,0.15)'}`,
      borderRadius: 3,
    }}
  >
    <div className="flex items-baseline justify-between gap-2">
      <span
        className="font-mono text-[11px] truncate"
        style={{ color: isNew ? '#993C1D' : '#3D3D3A' }}
      >
        {name}
      </span>
      <span
        className="font-mono text-[10px] shrink-0"
        style={{ color: isNew ? '#993C1D' : '#73726C', opacity: 0.5 }}
      >
        {isNew && '✦ '}
        {type}
      </span>
    </div>
    {encoding && (
      <span
        className="font-mono text-[10px] block mt-0.5"
        style={{ color: '#73726C', opacity: 0.3 }}
      >
        {encoding}
      </span>
    )}
  </div>
);

// ── Data context toggle ─────────────────────────────────────────

const DataContextSection: FC<{ dataContext: ChatDataContext | null }> = ({
  dataContext,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!dataContext) return null;

  const dims = dataContext.columns.filter((c) => c.role === 'dimension');
  const measures = dataContext.columns.filter((c) => c.role === 'measure');

  return (
    <div>
      <div
        className="flex items-center justify-between cursor-pointer py-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          className="font-mono text-[9px] uppercase tracking-wider"
          style={{ color: '#73726C', opacity: 0.5 }}
        >
          Data context
        </span>
        <span className="font-mono text-[9px]" style={{ color: '#73726C', opacity: 0.4 }}>
          {isOpen ? '▾ hide' : '▸ show'}
        </span>
      </div>
      {isOpen && (
        <div className="mt-2 space-y-1 text-[10px] font-mono" style={{ color: '#73726C' }}>
          <div>
            <span style={{ opacity: 0.5 }}>Source:</span> {dataContext.sourceName}
          </div>
          <div>
            <span style={{ opacity: 0.5 }}>Rows:</span>{' '}
            {dataContext.rowCount.toLocaleString()}
          </div>
          <div className="mt-1.5">
            <span style={{ opacity: 0.5 }}>Dimensions ({dims.length}):</span>
            {dims.map((c) => (
              <div key={c.name} className="ml-2 truncate" style={{ opacity: 0.7 }}>
                {c.name} <span style={{ opacity: 0.4 }}>({c.type})</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5">
            <span style={{ opacity: 0.5 }}>Measures ({measures.length}):</span>
            {measures.map((c) => (
              <div key={c.name} className="ml-2 truncate" style={{ opacity: 0.7 }}>
                {c.name} <span style={{ opacity: 0.4 }}>({c.type})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Divider ──────────────────────────────────────────────────────

const SbDivider: FC = () => (
  <div style={{ borderTop: '0.5px solid rgba(31,30,29,0.1)', margin: '8px 0' }} />
);

// ── Main sidebar ────────────────────────────────────────────────

interface PlanSidebarProps {
  plan: PlanDelta | null;
  dataContext: ChatDataContext | null;
  onGenerate: (approvals: ApprovalState) => void;
  isGenerating: boolean;
}

const PlanSidebar: FC<PlanSidebarProps> = ({
  plan,
  dataContext,
  onGenerate,
  isGenerating,
}) => {
  const [approvals, setApprovals] = useState<ApprovalState>({
    approved: new Set(),
    skipped: new Set(),
  });

  const handleApprove = useCallback((id: string) => {
    setApprovals((prev) => {
      const next = {
        approved: new Set(prev.approved),
        skipped: new Set(prev.skipped),
      };
      next.skipped.delete(id);
      next.approved.add(id);
      return next;
    });
  }, []);

  const handleSkip = useCallback((id: string) => {
    setApprovals((prev) => {
      const next = {
        approved: new Set(prev.approved),
        skipped: new Set(prev.skipped),
      };
      next.approved.delete(id);
      next.skipped.add(id);
      return next;
    });
  }, []);

  const handleApproveAll = useCallback(() => {
    if (!plan) return;
    setApprovals((prev) => {
      const next = {
        approved: new Set(prev.approved),
        skipped: new Set(prev.skipped),
      };
      plan.calculatedFields.forEach((cf) => {
        next.skipped.delete(cf.id);
        next.approved.add(cf.id);
      });
      plan.filters.forEach((_, i) => {
        const id = `filter_${i}`;
        next.skipped.delete(id);
        next.approved.add(id);
      });
      return next;
    });
  }, [plan]);

  // ── Empty state — no plan yet ─────────────────────────────────

  if (!plan) {
    return (
      <div className="h-full bg-ds-surface p-3" style={{ borderLeft: '0.5px solid rgba(0,0,0,0.06)' }}>
        <span
          className="font-mono text-[9px] uppercase tracking-wider"
          style={{ color: '#73726C', opacity: 0.5 }}
        >
          Dashboard plan
        </span>
        <p
          className="font-mono text-[11px] mt-4 leading-relaxed"
          style={{ color: '#9C9A92' }}
        >
          Captain is gathering context. The plan will appear here as the
          conversation progresses.
        </p>
        <SbDivider />
        <DataContextSection dataContext={dataContext} />
      </div>
    );
  }

  // ── Computed values ───────────────────────────────────────────

  const newIds = new Set(plan.isNew || []);
  const hasCharts = plan.charts.length > 0;
  const hasFilters = plan.filters.length > 0;
  const hasCalcs = plan.calculatedFields.length > 0;

  // Progress: count all approvable items (calcs + filters)
  const totalApprovable = plan.calculatedFields.length + plan.filters.length;
  const reviewedCount = [...plan.calculatedFields, ...plan.filters.map((_, i) => ({ id: `filter_${i}` }))].filter(
    (item) => approvals.approved.has(item.id) || approvals.skipped.has(item.id)
  ).length;
  const progressPct = totalApprovable > 0 ? (reviewedCount / totalApprovable) * 100 : 0;

  const hasUnreviewed = reviewedCount < totalApprovable;

  // Generate button counts
  const approvedCalcs = plan.calculatedFields.filter((cf) =>
    approvals.approved.has(cf.id)
  ).length;
  const approvedFilters = plan.filters.filter((_, i) =>
    approvals.approved.has(`filter_${i}`)
  ).length;
  const totalSheets = plan.kpis.length + plan.charts.length;

  const canGenerate = totalSheets > 0 && !hasUnreviewed && !isGenerating;

  return (
    <div className="h-full bg-ds-surface flex flex-col font-mono" style={{ borderLeft: '0.5px solid rgba(0,0,0,0.06)' }}>
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="px-3 pt-2.5 pb-0">
          <div className="flex items-baseline justify-between">
            <span
              className="text-[9px] uppercase tracking-wider"
              style={{ color: '#73726C', opacity: 0.5 }}
            >
              Dashboard plan
            </span>
            <span className="text-[9px]" style={{ color: '#2A9D8F' }}>
              Planning
            </span>
          </div>
          {plan.name && (
            <p className="text-[10px] font-medium mt-0.5" style={{ color: '#3D3D3A' }}>
              {plan.name}
            </p>
          )}
          <p className="text-[9px] mt-0.5" style={{ color: '#9C9A92' }}>
            {hasCalcs ? `${plan.calculatedFields.length} calcs` : '0 calcs'}
            {' · '}
            {hasCharts ? `${plan.charts.length} charts` : '0 charts (pending)'}
          </p>
        </div>

        <SbDivider />

        {/* Progress bar */}
        {totalApprovable > 0 && (
          <div className="px-3">
            <div
              className="h-[3px] mb-2 overflow-hidden"
              style={{ background: '#E8E6DE', borderRadius: 2 }}
            >
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${progressPct}%`,
                  background: '#2A9D8F',
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        )}

        {/* Calculations section */}
        <div className="px-3">
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[9px] uppercase tracking-wider"
              style={{ color: '#73726C', opacity: 0.5 }}
            >
              Calculations ({plan.calculatedFields.length})
            </span>
            {hasCalcs && (
              <button
                onClick={handleApproveAll}
                className="text-[9px] cursor-pointer hover:opacity-80"
                style={{
                  color: '#085041',
                  background: '#E1F5EE',
                  border: '0.4px solid #0F6E56',
                  borderRadius: 3,
                  padding: '1px 6px',
                }}
              >
                Approve all
              </button>
            )}
          </div>
          {hasCalcs ? (
            plan.calculatedFields.map((cf) => (
              <CalcCard
                key={cf.id}
                calc={cf}
                approvals={approvals}
                onApprove={handleApprove}
                onSkip={handleSkip}
              />
            ))
          ) : (
            <p className="text-[9px] mb-2" style={{ color: '#9C9A92' }}>
              Captain will propose after discovery
            </p>
          )}
        </div>

        <SbDivider />

        {/* Filters section */}
        <div className="px-3">
          <span
            className="text-[9px] uppercase tracking-wider block mb-1.5"
            style={{ color: '#73726C', opacity: 0.5 }}
          >
            Filters {hasFilters ? `(${plan.filters.length})` : '(pending review)'}
          </span>
          {hasFilters ? (
            plan.filters.map((f, i) => (
              <FilterCard
                key={`filter_${i}`}
                filter={f}
                index={i}
                approvals={approvals}
                onApprove={handleApprove}
                onSkip={handleSkip}
              />
            ))
          ) : (
            <p className="text-[9px] mb-2" style={{ color: '#9C9A92' }}>
              Captain will propose after layout
            </p>
          )}
        </div>

        <SbDivider />

        {/* KPIs section */}
        {plan.kpis.length > 0 && (
          <div className="px-3">
            <span
              className="text-[9px] uppercase tracking-wider block mb-1.5"
              style={{ color: '#73726C', opacity: 0.5 }}
            >
              KPIs ({plan.kpis.length})
            </span>
            {plan.kpis.map((kpi) => (
              <SheetRow key={kpi.id} name={kpi.name} type="kpi" isNew={newIds.has(kpi.id)} />
            ))}
          </div>
        )}

        {/* Charts section */}
        <div className="px-3">
          <span
            className="text-[9px] uppercase tracking-wider block mb-1.5"
            style={{ color: '#73726C', opacity: 0.5 }}
          >
            Charts
          </span>
          {hasCharts ? (
            plan.charts.map((chart) => (
              <SheetRow
                key={chart.id}
                name={chart.name}
                type={typeLabel(chart)}
                encoding={
                  chart.columns?.field && chart.rows?.field
                    ? `${chart.columns.field} × ${chart.rows.field}`
                    : ''
                }
                isNew={newIds.has(chart.id)}
              />
            ))
          ) : (
            <p className="text-[9px] mb-2" style={{ color: '#9C9A92' }}>
              Waiting for approved calculations...
            </p>
          )}
        </div>

        <SbDivider />

        {/* Data context */}
        <div className="px-3 pb-3">
          <DataContextSection dataContext={dataContext} />
        </div>
      </div>

      {/* Generate button — pinned to bottom */}
      <div className="px-3 pb-3">
        <button
          onClick={() => onGenerate(approvals)}
          disabled={!canGenerate}
          className="w-full py-2.5 text-[12px] font-medium cursor-pointer transition-all"
          style={{
            background: canGenerate ? '#3D82F6' : '#f5f3ee',
            color: canGenerate ? '#ffffff' : '#727785',
            border: canGenerate ? '0.5px solid #3D82F6' : '0.5px solid #e4e2dd',
            borderRadius: 8,
          }}
        >
          {isGenerating ? 'Generating…' : 'Generate Dashboard →'}
        </button>
        <p
          className="text-[9px] text-center mt-1.5"
          style={{ color: '#9C9A92' }}
        >
          {hasUnreviewed
            ? 'Review calculations to unlock'
            : `${totalSheets} sheets · ${approvedCalcs} approved calcs · ${approvedFilters} filters`}
        </p>
      </div>
    </div>
  );
};

export default PlanSidebar;
