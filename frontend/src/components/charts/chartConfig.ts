// ── Monochrome Color Palette ─────────────────────────────────────

export const CHART_COLORS = [
  '#0E0D0D', // ink
  '#525252', // gray-600
  '#2A9D8F', // accent teal
  '#a1a1a0', // gray-400
  '#737373', // gray-500
  '#d4d4d2', // gray-300
  '#404040', // gray-700
  '#e09f3e', // warning amber
] as const

export const ACCENT = '#2A9D8F'
export const INK = '#0E0D0D'
export const GRID_COLOR = '#e5e5e3'
export const AXIS_COLOR = '#a1a1a0'
export const TOOLTIP_BORDER = '#e5e5e3'

// ── Shared Recharts Style Props ──────────────────────────────────

export const AXIS_TICK_STYLE = {
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 10,
  fill: '#a1a1a0',
} as const

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#fff',
    border: '1px solid #e5e5e3',
    borderRadius: 2,
    padding: '8px 12px',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 11,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  labelStyle: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 10,
    color: '#a1a1a0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: 4,
  },
  itemStyle: {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 12,
    color: '#0E0D0D',
    padding: '1px 0',
  },
  cursor: { fill: 'rgba(0,0,0,0.03)' },
} as const

export const ANIMATION_DURATION = 300
export const ANIMATION_EASING = 'ease-out' as const

// ── Helpers ──────────────────────────────────────────────────────

export function getColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}
