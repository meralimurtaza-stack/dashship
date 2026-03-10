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
    <div className="border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Import Options
        </span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${
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
        <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-4">
          {/* Raw row preview */}
          {rawRows.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
                Raw file preview
              </span>
              <div className="overflow-x-auto border border-gray-100">
                <table className="w-full text-[11px]">
                  <tbody>
                    {rawRows.map((row, rowIdx) => {
                      const isHeader = rowIdx === options.headerRow - 1
                      const isSkipped = rowIdx < options.headerRow - 1
                      return (
                        <tr
                          key={rowIdx}
                          className={`border-b border-gray-100 transition-colors ${
                            isHeader
                              ? 'bg-gray-900 text-white'
                              : isSkipped
                              ? 'bg-gray-50 text-gray-300 line-through'
                              : ''
                          }`}
                        >
                          <td className={`px-2 py-1 font-mono tabular-nums w-8 text-right ${
                            isHeader ? 'text-gray-400' : 'text-gray-300'
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
                            <td className="px-2 py-1 text-gray-400 font-mono">
                              +{row.length - 8}
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="font-mono text-[9px] text-gray-300">
                Dark row = headers. Crossed-out rows above are skipped.
              </p>
            </div>
          )}

          {/* Controls */}
          <div className={`grid gap-6 ${isXlsx ? 'grid-cols-1 max-w-[200px]' : 'grid-cols-3'}`}>
            {/* Header Row — always shown */}
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-gray-400 block">
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
                className="w-full border border-gray-200 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-gray-900 transition-colors tabular-nums"
              />
              <p className="font-mono text-[9px] text-gray-300 tracking-wide">
                Row {options.headerRow} = headers, data from row {options.headerRow + 1}
              </p>
            </div>

            {/* CSV-only options */}
            {!isXlsx && (
              <>
                {/* Delimiter */}
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] uppercase tracking-widest text-gray-400 block">
                    Delimiter
                    {detectedDelimiter && (
                      <span className="normal-case tracking-normal ml-1 text-gray-300">
                        (detected: {detectedDelimiter === '\t' ? '\\t' : detectedDelimiter})
                      </span>
                    )}
                  </label>
                  <select
                    value={options.delimiter}
                    onChange={(e) => onChange({ delimiter: e.target.value as Delimiter })}
                    className="w-full border border-gray-200 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-gray-900 transition-colors bg-white"
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
                  <label className="font-mono text-[10px] uppercase tracking-widest text-gray-400 block">
                    Encoding
                  </label>
                  <select
                    value={options.encoding}
                    onChange={(e) => onChange({ encoding: e.target.value as Encoding })}
                    className="w-full border border-gray-200 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-gray-900 transition-colors bg-white"
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
              className="border border-gray-900 text-gray-900 font-mono text-[10px] uppercase tracking-wide px-4 py-2 hover:bg-gray-900 hover:text-white transition-colors"
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
