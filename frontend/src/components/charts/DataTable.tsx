import { type FC, useState, useMemo } from 'react'
import { autoFormat } from '../../engine/formatters'
import ChartWrapper from './ChartWrapper'

interface DataTableProps {
  data: Record<string, unknown>[]
  columns: string[]
  title?: string
  pageSize?: number
  loading?: boolean
}

type SortState = { field: string; order: 'asc' | 'desc' } | null

// ── Cell Value Formatting ────────────────────────────────────────

function formatCell(value: unknown): { text: string; color?: string } {
  if (value == null || value === '') return { text: '\u2014' }
  if (typeof value === 'number') {
    const text = autoFormat(value)
    if (value < 0) return { text, color: 'text-ds-error' }
    return { text }
  }
  return { text: String(value) }
}

function isNumeric(value: unknown): boolean {
  return typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '')
}

// ── Sort Icon ────────────────────────────────────────────────────

const SortIcon: FC<{ active: boolean; order: 'asc' | 'desc' }> = ({ active, order }) => (
  <span className={`ml-1 text-[10px] ${active ? 'text-ds-text' : 'text-ds-text-dim'}`}>
    {order === 'asc' ? '\u2191' : '\u2193'}
  </span>
)

// ── Main Component ───────────────────────────────────────────────

const DataTable: FC<DataTableProps> = ({
  data,
  columns,
  title,
  pageSize = 25,
  loading,
}) => {
  const [sort, setSort] = useState<SortState>(null)
  const [page, setPage] = useState(0)

  // Detect which columns are numeric for right-alignment
  const numericColumns = useMemo(() => {
    const set = new Set<string>()
    if (data.length === 0) return set
    const sample = data.slice(0, 10)
    for (const col of columns) {
      if (sample.every((r) => r[col] == null || r[col] === '' || isNumeric(r[col]))) {
        set.add(col)
      }
    }
    return set
  }, [data, columns])

  // Sort
  const sorted = useMemo(() => {
    if (!sort) return data
    return [...data].sort((a, b) => {
      const va = a[sort.field]
      const vb = b[sort.field]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      const na = Number(va), nb = Number(vb)
      if (!isNaN(na) && !isNaN(nb)) {
        return sort.order === 'asc' ? na - nb : nb - na
      }
      const cmp = String(va).localeCompare(String(vb))
      return sort.order === 'asc' ? cmp : -cmp
    })
  }, [data, sort])

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize)
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize)

  const handleSort = (field: string) => {
    setSort((prev) => {
      if (prev?.field === field) {
        return prev.order === 'asc' ? { field, order: 'desc' } : null
      }
      return { field, order: 'asc' }
    })
    setPage(0)
  }

  return (
    <ChartWrapper title={title} loading={loading} empty={data.length === 0}>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-ds-border">
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className={`px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-ds-text-dim font-medium cursor-pointer select-none hover:text-ds-text transition-colors ${
                    numericColumns.has(col) ? 'text-right' : 'text-left'
                  }`}
                >
                  {col}
                  <SortIcon
                    active={sort?.field === col}
                    order={sort?.field === col ? sort.order : 'asc'}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, ri) => (
              <tr
                key={ri}
                className={`border-b border-ds-border transition-colors hover:bg-ds-surface-alt ${
                  ri % 2 === 1 ? 'bg-ds-surface-alt/50' : ''
                }`}
              >
                {columns.map((col) => {
                  const { text, color } = formatCell(row[col])
                  return (
                    <td
                      key={col}
                      className={`px-4 py-2 font-mono text-xs tabular-nums ${
                        numericColumns.has(col) ? 'text-right' : 'text-left'
                      } ${color ?? 'text-ds-text'}`}
                    >
                      {text}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-ds-border">
          <p className="font-mono text-[10px] text-ds-text-dim tabular-nums">
            {page * pageSize + 1}\u2013{Math.min((page + 1) * pageSize, sorted.length)} of{' '}
            {sorted.length.toLocaleString()}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide border border-ds-border text-ds-text-muted hover:bg-ds-surface-alt disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide border border-ds-border text-ds-text-muted hover:bg-ds-surface-alt disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </ChartWrapper>
  )
}

export default DataTable
