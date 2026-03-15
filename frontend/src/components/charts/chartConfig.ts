// ── Economist-grade 4-Colour Palette ─────────────────────────────

export const CHART_COLORS = [
  '#1C3360', // ink-blue — primary
  '#141210', // near-black — secondary
  '#8D8981', // warm grey — tertiary
  '#C8963E', // gold — highlight
] as const

export const ACCENT = '#1C3360'
export const INK = '#141210'
export const GRID_COLOR = '#D7D3C9'
export const AXIS_COLOR = '#A19D94'
export const TOOLTIP_BORDER = '#D7D3C9'

// ── Shared Recharts Style Props ──────────────────────────────────

export const AXIS_TICK_STYLE = {
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 10,
  fill: '#A19D94',
} as const

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#FAFAF6',
    border: '1px solid #D7D3C9',
    borderRadius: 0,
    padding: '8px 12px',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 11,
    boxShadow: 'none',
  },
  labelStyle: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 10,
    color: '#A19D94',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  itemStyle: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 12,
    color: '#141210',
    padding: '1px 0',
  },
  cursor: { fill: 'rgba(28,51,96,0.04)' },
} as const

export const ANIMATION_DURATION = 300
export const ANIMATION_EASING = 'ease-out' as const

// ── Helpers ──────────────────────────────────────────────────────

export function getColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}
