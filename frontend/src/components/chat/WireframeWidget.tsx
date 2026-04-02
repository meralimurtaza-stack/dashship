/**
 * components/chat/WireframeWidget.tsx
 *
 * Renders the inline wireframe widget inside Captain's chat messages.
 * Clean, editorial design — neutral tones, mini chart sketches,
 * symbol icons for KPIs, subtle card borders.
 */

import { type FC } from 'react';
import type { PlanDelta, PlanKPI, PlanChart } from '../../utils/plan-parser';

// ── Format icon ─────────────────────────────────────────────────

function formatIcon(format?: { type?: string; prefix?: string }): string {
  if (!format) return '#';
  if (format.type === 'currency') return format.prefix || '$';
  if (format.type === 'percent') return '%';
  return '#';
}

// ── Mark type label ─────────────────────────────────────────────

function markLabel(markType: string, config?: { orientation?: string }): string {
  if (markType === 'bar' && config?.orientation === 'horizontal') return 'H-bar';
  if (markType === 'area') return 'Area';
  if (markType === 'scatter') return 'Scatter';
  if (markType === 'pie') return 'Donut';
  if (markType === 'table') return 'Table';
  if (markType === 'line') return 'Line';
  return markType.charAt(0).toUpperCase() + markType.slice(1);
}

// ── Subtitle builder ────────────────────────────────────────────

function chartSubtitle(chart: PlanChart): string {
  const parts: string[] = [];
  parts.push(markLabel(chart.markType, chart.config));
  if (chart.columns?.granularity) parts.push(`· ${chart.columns.granularity}`);
  if (chart.config?.sort?.order === 'desc') parts.push('· sorted');
  if (chart.config?.limit) parts.push(`· top ${chart.config.limit}`);
  return parts.join(' ');
}

// ── Mini chart sketch shapes ────────────────────────────────────

const MiniLine: FC = () => (
  <svg width="100%" height="24" viewBox="0 0 100 24" preserveAspectRatio="none" style={{ marginTop: 6, opacity: 0.15 }}>
    <path
      d="M2 18 Q15 14, 28 16 Q40 18, 52 10 Q65 4, 78 7 L98 3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const MiniBars: FC = () => (
  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 24, marginTop: 6, opacity: 0.12 }}>
    <div style={{ flex: 1, height: '100%', background: 'currentColor', borderRadius: 2 }} />
    <div style={{ flex: 1, height: '70%', background: 'currentColor', borderRadius: 2 }} />
    <div style={{ flex: 1, height: '45%', background: 'currentColor', borderRadius: 2 }} />
  </div>
);

const MiniHBars: FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6, opacity: 0.12 }}>
    <div style={{ width: '85%', height: 5, background: 'currentColor', borderRadius: 2 }} />
    <div style={{ width: '60%', height: 5, background: 'currentColor', borderRadius: 2 }} />
    <div style={{ width: '35%', height: 5, background: 'currentColor', borderRadius: 2 }} />
  </div>
);

const MiniDonut: FC = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" style={{ marginTop: 4, opacity: 0.12, alignSelf: 'center' }}>
    <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
  </svg>
);

const MiniScatter: FC = () => (
  <svg width="100%" height="24" viewBox="0 0 100 24" style={{ marginTop: 6, opacity: 0.12 }}>
    <circle cx="15" cy="16" r="2.5" fill="currentColor" />
    <circle cx="30" cy="8" r="2.5" fill="currentColor" />
    <circle cx="50" cy="12" r="2.5" fill="currentColor" />
    <circle cx="68" cy="5" r="2.5" fill="currentColor" />
    <circle cx="85" cy="18" r="2.5" fill="currentColor" />
  </svg>
);

const MiniTable: FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6, opacity: 0.10 }}>
    <div style={{ width: '100%', height: 3, background: 'currentColor', borderRadius: 1 }} />
    <div style={{ width: '90%', height: 3, background: 'currentColor', borderRadius: 1 }} />
    <div style={{ width: '95%', height: 3, background: 'currentColor', borderRadius: 1 }} />
  </div>
);

function MiniSketch({ markType, config }: { markType: string; config?: { orientation?: string } }) {
  if (markType === 'line' || markType === 'area') return <MiniLine />;
  if (markType === 'bar' && config?.orientation === 'horizontal') return <MiniHBars />;
  if (markType === 'bar') return <MiniBars />;
  if (markType === 'pie') return <MiniDonut />;
  if (markType === 'scatter') return <MiniScatter />;
  if (markType === 'table') return <MiniTable />;
  return null;
}

// ── KPI card wireframe ──────────────────────────────────────────

const KPIWireframe: FC<{ kpi: PlanKPI }> = ({ kpi }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 8px',
      background: '#FFFFFF',
      border: '1px solid #E8E6DE',
      borderRadius: 6,
      minWidth: 0,
    }}
  >
    <span
      style={{
        fontFamily: '"Space Grotesk", monospace',
        fontSize: 13,
        color: '#A19D94',
        lineHeight: 1,
      }}
    >
      {formatIcon(kpi.format)}
    </span>
    <span
      style={{
        fontFamily: '"Manrope", sans-serif',
        fontSize: 12,
        fontWeight: 500,
        color: '#3A3833',
        marginTop: 4,
        textAlign: 'center',
        lineHeight: 1.2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}
    >
      {kpi.name}
    </span>
  </div>
);

// ── Chart card wireframe ────────────────────────────────────────

const ChartWireframe: FC<{ chart: PlanChart; isFullWidth?: boolean }> = ({ chart, isFullWidth }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      padding: '10px 12px',
      background: '#FFFFFF',
      border: '1px solid #E8E6DE',
      borderRadius: 6,
      minWidth: 0,
      gridColumn: isFullWidth ? '1 / -1' : undefined,
      color: '#3A3833',
    }}
  >
    <span
      style={{
        fontFamily: '"Manrope", sans-serif',
        fontSize: 12,
        fontWeight: 500,
        color: '#1A1917',
        lineHeight: 1.2,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {chart.name}
    </span>
    <span
      style={{
        fontFamily: '"Space Grotesk", monospace',
        fontSize: 10,
        color: '#A19D94',
        marginTop: 2,
        lineHeight: 1,
      }}
    >
      {chartSubtitle(chart)}
    </span>
    <MiniSketch markType={chart.markType} config={chart.config} />
  </div>
);

// ── Filter chip ─────────────────────────────────────────────────

const FilterChip: FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      fontFamily: '"Space Grotesk", monospace',
      fontSize: 10,
      color: '#6D6860',
      padding: '3px 8px',
      background: '#FFFFFF',
      border: '1px solid #E8E6DE',
      borderRadius: 3,
      whiteSpace: 'nowrap',
    }}
  >
    {label} ▾
  </div>
);

// ── Main wireframe widget ───────────────────────────────────────

interface WireframeWidgetProps {
  plan: PlanDelta;
}

const WireframeWidget: FC<WireframeWidgetProps> = ({ plan }) => {
  const tables = plan.charts.filter(c => c.markType === 'table');
  const charts = plan.charts.filter(c => c.markType !== 'table');
  const fullWidthTypes = new Set(['line', 'area']);

  return (
    <div
      style={{
        margin: '12px 0',
        padding: 12,
        background: '#F5F4ED',
        border: '1px solid #E8E6DE',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      {/* Filter row */}
      {plan.filters.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {plan.filters.map((f, i) => (
            <FilterChip key={i} label={f.field} />
          ))}
        </div>
      )}

      {/* KPI row */}
      {plan.kpis.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(plan.kpis.length, 4)}, 1fr)`,
            gap: 6,
            marginBottom: 10,
          }}
        >
          {plan.kpis.map(kpi => (
            <KPIWireframe key={kpi.id} kpi={kpi} />
          ))}
        </div>
      )}

      {/* Chart grid */}
      {charts.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 6,
            marginBottom: tables.length > 0 ? 6 : 0,
          }}
        >
          {charts.map(chart => (
            <ChartWireframe
              key={chart.id}
              chart={chart}
              isFullWidth={fullWidthTypes.has(chart.markType)}
            />
          ))}
        </div>
      )}

      {/* Tables — full width */}
      {tables.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 6 }}>
          {tables.map(chart => (
            <ChartWireframe key={chart.id} chart={chart} isFullWidth />
          ))}
        </div>
      )}
    </div>
  );
};

export default WireframeWidget;
