import { type FC } from 'react'
import { formatValue, formatDelta, type FormatConfig } from '../../lib/formatValue'
import ChartCard, { type ChartInfo } from './ChartCard'
import { POSITIVE_COLOR, NEGATIVE_COLOR, NEUTRAL_COLOR } from './chartConfig'

interface KPICardProps {
  label: string
  value: number
  format?: FormatConfig
  comparison?: {
    value: number
    label?: string
    isPercentageMetric?: boolean
  }
  isSelected?: boolean
  onClick?: () => void
  index?: number
  info?: ChartInfo
}

const KPICard: FC<KPICardProps> = ({
  label,
  value,
  format,
  comparison,
  isSelected,
  onClick,
  index,
  info,
}) => {
  const formattedValue = format
    ? formatValue(value, format)
    : formatValue(value)

  const delta = comparison
    ? formatDelta(value, comparison.value, comparison.isPercentageMetric)
    : null

  return (
    <ChartCard
      title={label}
      isSelected={isSelected}
      onClick={onClick}
      index={index}
      info={info}
    >
      <p
        style={{
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          fontSize: 28,
          fontWeight: 500,
          color: '#0E0D0D',
          lineHeight: 1,
          margin: 0,
        }}
      >
        {formattedValue}
      </p>

      {delta && (
        <p
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 12,
            color: delta.direction === 'up'
              ? POSITIVE_COLOR
              : delta.direction === 'down'
                ? NEGATIVE_COLOR
                : NEUTRAL_COLOR,
            marginTop: 8,
            lineHeight: 1,
          }}
        >
          {delta.text}
          {comparison?.label ? ` ${comparison.label}` : ''}
        </p>
      )}
    </ChartCard>
  )
}

export default KPICard
