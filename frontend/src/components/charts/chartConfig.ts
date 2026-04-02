// ── Design Tokens ────────────────────────────────────────────────
// DashShip dashboard visual system — strict 4-colour palette

// Primary series colors for charts
// #1B2A4A at 100%, 70%, 40% opacity equivalents on white bg
export const SERIES_COLORS = [
  '#1B2A4A', // primary — dark navy
  '#8B7BA8', // secondary — dusty purple
  '#8C6E5D', // tertiary — copper brown
  '#5C7A99', // quaternary — cool steel
  // If more than 4 series needed, use primary at descending opacities:
  'rgba(27,42,74,0.70)',
  'rgba(27,42,74,0.50)',
  'rgba(27,42,74,0.35)',
  'rgba(27,42,74,0.20)',
] as const

// Pie/donut palette (same strict 4-colour system)
export const PIE_PALETTE = [
  '#1B2A4A', // primary — dark navy
  '#8B7BA8', // secondary — dusty purple
  '#8C6E5D', // tertiary — copper brown
  '#5C7A99', // quaternary — cool steel
  'rgba(27,42,74,0.70)',
  'rgba(27,42,74,0.50)',
  'rgba(27,42,74,0.35)',
  'rgba(27,42,74,0.20)',
] as const

// Legacy exports for backward compat
export const CHART_COLORS = SERIES_COLORS

// RAG indicator colors — ONLY for arrows/variance text, NEVER in chart data
export const POSITIVE_COLOR = '#2A9D8F' // teal green — upward arrows, positive variance
export const NEGATIVE_COLOR = '#C0392B' // muted red — downward arrows, negative variance
export const NEUTRAL_COLOR = '#8A8A86'  // gray — axis labels, grid lines, muted text

export const ACCENT = '#3D82F6'
export const INK = '#1b1c19'
export const GRID_COLOR = '#E8E8E6'
export const AXIS_COLOR = '#8A8A86'
export const TOOLTIP_BORDER = '#E8E8E6'
export const GRID_STROKE = '#E8E8E6'

// ── Chart Card Tokens ────────────────────────────────────────────
export const CARD_PADDING = 20
export const CARD_BORDER = '0.5px solid #E8E8E6'
export const CARD_RADIUS = 8
export const CARD_TITLE_STYLE = {
  fontFamily: '"Space Grotesk", monospace',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  color: '#8A8A86',
  lineHeight: 1,
  margin: 0,
} as const

// ── Shared Recharts Styles ──────────────────────────────────────

export const AXIS_STYLE = {
  fontFamily: '"Space Grotesk", monospace',
  fontSize: 10,
  fill: '#8A8A86',
} as const

// Legacy alias
export const AXIS_TICK_STYLE = AXIS_STYLE

export const TOOLTIP_CONFIG = {
  contentStyle: {
    background: '#FFFFFF',
    border: '0.5px solid #E8E8E6',
    borderRadius: 8,
    padding: '10px 12px',
    fontFamily: '"Space Grotesk", monospace',
    fontSize: 11,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  labelStyle: {
    fontFamily: '"Space Grotesk", monospace',
    fontSize: 10,
    color: '#8A8A86',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 4,
  },
  itemStyle: {
    fontFamily: '"Space Grotesk", monospace',
    fontSize: 12,
    color: '#1b1c19',
    padding: '1px 0',
  },
  cursor: { fill: 'rgba(27,42,74,0.06)' },
} as const

// Legacy alias
export const TOOLTIP_STYLE = TOOLTIP_CONFIG

export const ANIMATION_DURATION = 400
export const ANIMATION_EASING = 'ease-out' as const

// ── Helpers ─────────────────────────────────────────────────────

export function getColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length]
}
