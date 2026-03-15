import { useState, useEffect, type FC } from 'react'
import type { CsvParseOptions, Delimiter, Encoding } from '../../types/datasource'
import { previewRawRows } from '../../engine/parser'

interface ImportOptionsPanelProps {
  options: CsvParseOptions
  detectedDelimiter: string | null
  isXlsx: boolean
  file: File | null
  onChange: (options: Partial<CsvParseOptions>) => void
}

const DELIMITERS: { value: Delimiter; label: string }[] = [
  { value: ',', label: 'Comma (,)' },
  { value: '\t', label: 'Tab (\\t)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '|', label: 'Pipe (|)' },
]

const ENCODINGS: Encoding[] = ['UTF-8', 'Latin-1', 'Windows-1252']

const MAX_PREVIEW_ROWS = 5

const ImportOptionsPanel: FC<ImportOptionsPanelProps> = ({
  options, detectedDelimiter, isXlsx, file, onChange,
}) => {
  const [expanded, setExpanded] = useState(false)
  const [rawRows, setRawRows] = useState<string[][]>([])

  // Load raw row preview when file changes or panel opens
  useEffect(() => {
    if (!file || !expanded) return
    let cancelled = false
    previewRawRows(file, MAX_PREVIEW_ROWS).then((rows) => {
      if (!cancelled) setRawRows(rows)
    }).catch(() => {
      if (!cancelled) setRawRows([])
    })
    return () => { cancelled = true }
  }, [file, expanded])

  return (
    <div className="border border-ds-border bg-ds-surface">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-ds-surface-alt transition-colors"
      >
        <span className="micro-label">
          Import Options
        </span>
        <svg
          className={`w-3 h-3 text-ds-text-dim transition-transform duration-150 ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-ds-border space-y-4">
          {/* Raw row preview */}
          {rawRows.length > 0 && (
            <div className="space-y-1.5">
              <span className="micro-label">
                Raw file preview
              </span>
              <div className="overflow-x-auto border border-ds-border">
                <table className="w-full text-[11px]">
                  <tbody>
                    {rawRows.map((row, rowIdx) => {
                      const isHeader = rowIdx === options.headerRow - 1
                      const isSkipped = rowIdx < options.headerRow - 1
                      return (
                        <tr
                          key={rowIdx}
                          className={`border-b border-ds-border transition-colors ${
                            isHeader
                              ? 'bg-ds-accent text-white'
                              : isSkipped
                              ? 'bg-ds-surface-alt text-ds-text-dim line-through'
                              : ''
                          }`}
                        >
                          <td className={`px-2 py-1 font-mono tabular-nums w-8 text-right ${
                            isHeader ? 'text-ds-text-dim' : 'text-ds-text-dim'
                          }`}>
                            {rowIdx + 1}
                          </td>
                          {row.slice(0, 8).map((cell, colIdx) => (
                            <td
                              key={colIdx}
                              className={`px-2 py-1 truncate max-w-[120px] font-mono ${
                                isHeader ? 'font-medium' : ''
                              }`}
                            >
                              {cell || '\u2014'}
                            </td>
                          ))}
                          {row.length > 8 && (
                            <td className="px-2 py-1 text-ds-text-dim font-mono">
                              +{row.length - 8}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="font-mono text-[9px] text-ds-text-dim">
                Dark row = headers. Crossed-out rows above are skipped.
              </p>
            </div>
          )}

          {/* Controls */}
          <div className={`grid gap-6 ${isXlsx ? 'grid-cols-1 max-w-[200px]' : 'grid-cols-3'}`}>
            {/* Header Row — always shown */}
            <div className="space-y-1.5">
              <label className="micro-label block">
                Header row
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={options.headerRow}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (v >= 1 && v <= 100) onChange({ headerRow: v })
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onChange({ headerRow: options.headerRow })
                  }
                }}
                className="w-full border border-ds-border px-3 py-2 font-mono text-sm text-ds-text outline-none focus:border-ds-accent transition-colors tabular-nums"
              />
              <p className="font-mono text-[9px] text-ds-text-dim tracking-wide">
                Row {options.headerRow} = headers, data from row {options.headerRow + 1}
              </p>
            </div>

            {/* CSV-only options */}
            {!isXlsx && (
              <>
                {/* Delimiter */}
                <div className="space-y-1.5">
                  <label className="micro-label block">
                    Delimiter
                    {detectedDelimiter && (
                      <span className="normal-case tracking-normal ml-1 text-ds-text-dim">
                        (detected: {detectedDelimiter === '\t' ? '\\t' : detectedDelimiter})
                      </span>
                    )}
                  </label>
                  <select
                    value={options.delimiter}
                    onChange={(e) => onChange({ delimiter: e.target.value as Delimiter })}
                    className="w-full border border-ds-border px-3 py-2 font-mono text-sm text-ds-text outline-none focus:border-ds-accent transition-colors bg-ds-surface"
                  >
                    {DELIMITERS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Encoding */}
                <div className="space-y-1.5">
                  <label className="micro-label block">
                    Encoding
                  </label>
                  <select
                    value={options.encoding}
                    onChange={(e) => onChange({ encoding: e.target.value as Encoding })}
                    className="w-full border border-ds-border px-3 py-2 font-mono text-sm text-ds-text outline-none focus:border-ds-accent transition-colors bg-ds-surface"
                  >
                    {ENCODINGS.map((enc) => (
                      <option key={enc} value={enc}>
                        {enc}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onChange(options)}
              className="border border-ds-accent text-ds-text font-mono text-[10px] uppercase tracking-wide px-4 py-2 hover:bg-ds-accent hover:text-white transition-colors"
            >
              Re-parse
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImportOptionsPanel
