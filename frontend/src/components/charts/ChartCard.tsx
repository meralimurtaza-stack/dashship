import { type FC, type ReactNode } from 'react'
import {
  CARD_PADDING,
  CARD_BORDER,
  CARD_RADIUS,
  CARD_TITLE_STYLE,
} from './chartConfig'

// ── Chart Info (hover tooltip data) ──────────────────────────────

export interface ChartInfo {
  encoding: {
    columns?: { field: string; aggregation?: string }
    rows?: { field: string; aggregation?: string }
    color?: { field: string }
    size?: { field: string }
  }
  markType: string
  calculatedFields?: string[]
  warnings?: string[]
}

// ── Props ────────────────────────────────────────────────────────

interface ChartCardProps {
  title: string
  children: ReactNode
  isSelected?: boolean
  onClick?: () => void
  className?: string
  index?: number
  info?: ChartInfo
}

// ── Helpers ──────────────────────────────────────────────────────

function formatBinding(label: string, b: { field: string; aggregation?: string }): string {
  return b.aggregation && b.aggregation !== 'none'
    ? `${label}: ${b.field} (${b.aggregation})`
    : `${label}: ${b.field}`
}

// ── Component ────────────────────────────────────────────────────

const ChartCard: FC<ChartCardProps> = ({
  title,
  children,
  isSelected = false,
  onClick,
  className = '',
  index = 0,
  info,
}) => {
  const hasWarnings = info?.warnings && info.warnings.length > 0

  return (
    <div
      onClick={onClick}
      className={`
        bg-white overflow-visible transition-all duration-200 relative
        ${isSelected ? 'ring-2 ring-[#1B2A4A]' : ''}
        ${onClick ? 'cursor-pointer hover:brightness-[0.98]' : ''}
        ${className}
      `}
      style={{
        padding: CARD_PADDING,
        border: CARD_BORDER,
        borderRadius: CARD_RADIUS,
        animation: `chartFadeIn 400ms ease-out ${index * 100}ms both`,
      }}
    >
      {/* Header row: title + info icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <p style={CARD_TITLE_STYLE}>
          {title}
        </p>

        {info && (
          <div className="group/info relative" style={{ marginLeft: 8, flexShrink: 0 }}>
            {/* Info icon */}
            <div
              style={{
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'help',
                border: `1px solid ${hasWarnings ? '#B8860B' : '#C7C2B5'}`,
                borderRadius: 4,
              }}
            >
              <span
                style={{
                  fontFamily: '"Space Grotesk", monospace',
                  fontSize: 9,
                  fontWeight: 500,
                  color: hasWarnings ? '#B8860B' : '#8A8A86',
                  lineHeight: 1,
                }}
              >
                i
              </span>
            </div>

            {/* Tooltip */}
            <div
              className="opacity-0 pointer-events-none group-hover/info:opacity-100 group-hover/info:pointer-events-auto transition-opacity duration-150"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                width: 240,
                backgroundColor: '#FFFFFF',
                border: CARD_BORDER,
                borderRadius: CARD_RADIUS,
                padding: '10px 12px',
                zIndex: 50,
              }}
            >
              {/* Encoding section */}
              <p style={{
                fontFamily: '"Space Grotesk", monospace',
                fontSize: 9,
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: '#8A8A86',
                margin: '0 0 4px 0',
              }}>
                Encoding
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
                {info.encoding.columns && (
                  <span style={{ fontFamily: '"Manrope", sans-serif', fontSize: 11, color: '#6D6860' }}>
                    {formatBinding('Columns', info.encoding.columns)}
                  </span>
                )}
                {info.encoding.rows && (
                  <span style={{ fontFamily: '"Manrope", sans-serif', fontSize: 11, color: '#6D6860' }}>
                    {formatBinding('Rows', info.encoding.rows)}
                  </span>
                )}
                {info.encoding.color && (
                  <span style={{ fontFamily: '"Manrope", sans-serif', fontSize: 11, color: '#6D6860' }}>
                    Color: {info.encoding.color.field}
                  </span>
                )}
                {info.encoding.size && (
                  <span style={{ fontFamily: '"Manrope", sans-serif', fontSize: 11, color: '#6D6860' }}>
                    Size: {info.encoding.size.field}
                  </span>
                )}
                <span style={{ fontFamily: '"Manrope", sans-serif', fontSize: 11, color: '#8A8A86' }}>
                  Mark: {info.markType}
                </span>
              </div>

              {/* Calculated fields section */}
              {info.calculatedFields && info.calculatedFields.length > 0 && (
                <>
                  <p style={{
                    fontFamily: '"Space Grotesk", monospace',
                    fontSize: 9,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#8A8A86',
                    margin: '0 0 4px 0',
                  }}>
                    Calculated Fields
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
                    {info.calculatedFields.map((cf, i) => (
                      <span key={i} style={{ fontFamily: '"Space Grotesk", monospace', fontSize: 11, color: '#6D6860' }}>
                        {cf}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* Warnings section */}
              {hasWarnings && (
                <>
                  <p style={{
                    fontFamily: '"Space Grotesk", monospace',
                    fontSize: 9,
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#B8860B',
                    margin: '0 0 4px 0',
                  }}>
                    Warnings
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {info!.warnings!.map((w, i) => (
                      <span key={i} style={{ fontFamily: '"Manrope", sans-serif', fontSize: 11, color: '#B8860B', lineHeight: 1.4 }}>
                        {w}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart content */}
      <div>
        {children}
      </div>
    </div>
  )
}

export default ChartCard
