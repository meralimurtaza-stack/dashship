import { useState, type FC } from 'react'
import type { CsvParseOptions, Delimiter, Encoding } from '../../types/datasource'

interface CsvOptionsPanelProps {
  options: CsvParseOptions
  detectedDelimiter: string | null
  isXlsx: boolean
  onChange: (options: Partial<CsvParseOptions>) => void
}

const DELIMITERS: { value: Delimiter; label: string }[] = [
  { value: ',', label: 'Comma (,)' },
  { value: '\t', label: 'Tab (\\t)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '|', label: 'Pipe (|)' },
]

const ENCODINGS: Encoding[] = ['UTF-8', 'Latin-1', 'Windows-1252']

const CsvOptionsPanel: FC<CsvOptionsPanelProps> = ({
  options, detectedDelimiter, isXlsx, onChange,
}) => {
  const [expanded, setExpanded] = useState(false)

  if (isXlsx) return null

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
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-6">
            {/* Header Row */}
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase tracking-widest text-gray-400 block">
                Data starts at row
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
                className="w-full border border-gray-200 px-3 py-2 font-mono text-sm text-ink outline-none focus:border-gray-900 transition-colors tabular-nums"
              />
            </div>

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
          </div>

          <div className="mt-3 flex justify-end">
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

export default CsvOptionsPanel
