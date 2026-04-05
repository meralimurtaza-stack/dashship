import { type FC, useMemo } from 'react'
import { formatValue, type FormatConfig } from '../../lib/formatValue'
import ChartCard, { type ChartInfo } from './ChartCard'

interface DataTableProps {
  data: Record<string, unknown>[]
  columns: string[]
  formats?: Record<string, FormatConfig>
  title: string
  isSelected?: boolean
  onClick?: () => void
  index?: number
  info?: ChartInfo
}

const DataTableComponent: FC<DataTableProps> = ({
  data,
  columns,
  formats,
  title,
  isSelected,
  onClick,
  index,
  info,
}) => {
  // Determine which columns are numeric for right-alignment
  const numericCols = useMemo(() => {
    const set = new Set<string>()
    if (data.length === 0) return set
    for (const col of columns) {
      const sample = data[0][col]
      if (typeof sample === 'number') set.add(col)
    }
    return set
  }, [data, columns])

  if (data.length === 0 || columns.length === 0) {
    return (
      <ChartCard title={title} isSelected={isSelected} onClick={onClick} index={index} info={info}>
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 12, color: '#8A8A86' }}>No data</span>
        </div>
      </ChartCard>
    )
  }

  const headerStyle: React.CSSProperties = {
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    color: '#8A8A86',
    padding: '8px 12px',
    borderBottom: '0.5px solid #E8E8E6',
    whiteSpace: 'nowrap',
  }

  const cellStyle: React.CSSProperties = {
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    fontSize: 13,
    color: '#0E0D0D',
    padding: '7px 12px',
    whiteSpace: 'nowrap',
  }

  return (
    <ChartCard title={title} isSelected={isSelected} onClick={onClick} index={index} info={info}>
      <div style={{ maxHeight: 320, overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col}
                  style={{
                    ...headerStyle,
                    textAlign: numericCols.has(col) ? 'right' : 'left',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#FFFFFF',
                    zIndex: 1,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{
                  backgroundColor: rowIdx % 2 === 1 ? 'rgba(0,0,0,0.02)' : 'transparent',
                }}
              >
                {columns.map(col => {
                  const raw = row[col]
                  const isNum = typeof raw === 'number'
                  const isNeg = isNum && raw < 0

                  let display: string
                  if (isNum) {
                    const fmt = formats?.[col]
                    display = fmt ? formatValue(raw, fmt) : formatValue(raw)
                  } else {
                    display = raw == null ? '—' : String(raw)
                  }

                  return (
                    <td
                      key={col}
                      style={{
                        ...cellStyle,
                        textAlign: numericCols.has(col) ? 'right' : 'left',
                        fontFamily: isNum ? '"IBM Plex Mono", monospace' : cellStyle.fontFamily,
                        color: isNeg ? '#C0392B' : cellStyle.color,
                      }}
                    >
                      {display}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  )
}

export default DataTableComponent
