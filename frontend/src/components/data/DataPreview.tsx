import { useState, useMemo, type FC } from 'react'
import type { DataSchema } from '../../types/datasource'

interface DataPreviewProps {
  schema: DataSchema
  rows: Record<string, unknown>[]
  maxRows?: number
}

type SortDir = 'asc' | 'desc' | null

const DataPreview: FC<DataPreviewProps> = ({ schema, rows, maxRows = 100 }) => {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  const handleSort = (col: string) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else if (sortDir === 'desc') {
        setSortCol(null)
        setSortDir(null)
      }
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sortedRows = useMemo(() => {
    const sliced = rows.slice(0, maxRows)
    if (!sortCol || !sortDir) return sliced

    return [...sliced].sort((a, b) => {
      const va = a[sortCol]
      const vb = b[sortCol]
      const sa = String(va ?? '')
      const sb = String(vb ?? '')
      const na = Number(sa)
      const nb = Number(sb)

      if (!isNaN(na) && !isNaN(nb)) {
        return sortDir === 'asc' ? na - nb : nb - na
      }
      return sortDir === 'asc'
        ? sa.localeCompare(sb)
        : sb.localeCompare(sa)
    })
  }, [rows, maxRows, sortCol, sortDir])

  const colMeta = schema.columns

  return (
    <div className="border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Preview
        </span>
        <span className="font-mono text-[10px] text-gray-400 tabular-nums">
          {Math.min(maxRows, rows.length)} of {rows.length} rows
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {colMeta.map((col) => (
                <th
                  key={col.name}
                  onClick={() => handleSort(col.name)}
                  className="text-left px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink truncate">
                      {col.name}
                    </span>
                    <span
                      className={`font-mono text-[9px] uppercase px-1 py-0.5 ${
                        col.role === 'measure'
                          ? 'text-accent bg-accent/8'
                          : 'text-gray-400 bg-gray-100'
                      }`}
                    >
                      {col.role === 'measure' ? 'M' : 'D'}
                    </span>
                    {sortCol === col.name && (
                      <span className="text-[10px] text-gray-400">
                        {sortDir === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 hover:bg-gray-100/50 transition-colors"
              >
                {colMeta.map((col) => {
                  const val = row[col.name]
                  const display = val == null || String(val).trim() === ''
                    ? '—'
                    : String(val)
                  const isNum = col.type === 'number'

                  return (
                    <td
                      key={col.name}
                      className={`px-4 py-2 truncate max-w-[200px] ${
                        isNum
                          ? 'font-mono tabular-nums text-right text-ink'
                          : 'text-gray-600'
                      } ${display === '—' ? 'text-gray-300' : ''}`}
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
    </div>
  )
}

export default DataPreview
