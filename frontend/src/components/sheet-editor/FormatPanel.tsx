import { type FC, useCallback } from 'react'
import type { Sheet } from '../../types/sheet'
import { CHART_COLORS } from '../charts/chartConfig'

interface FormatPanelProps {
  sheet: Sheet
  onUpdate: (sheet: Sheet) => void
}

// ── Select Control ──────────────────────────────────────────────

const ControlLabel: FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="font-mono text-[9px] uppercase tracking-widest text-gray-400 block mb-1">
    {children}
  </label>
)

const SelectControl: FC<{
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}> = ({ label, value, options, onChange }) => (
  <div>
    <ControlLabel>{label}</ControlLabel>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-gray-200 outline-none focus:border-gray-400 appearance-none cursor-pointer"
      style={{ borderRadius: 2 }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
)

// ── Toggle Control ──────────────────────────────────────────────

const ToggleControl: FC<{
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}> = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between py-1 cursor-pointer group">
    <span className="font-mono text-[10px] uppercase tracking-wide text-gray-500 group-hover:text-ink transition-colors">
      {label}
    </span>
    <button
      onClick={() => onChange(!checked)}
      className={`
        w-7 h-4 rounded-full transition-colors relative
        ${checked ? 'bg-accent' : 'bg-gray-200'}
      `}
    >
      <span
        className={`
          absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow-sm
          ${checked ? 'left-3.5' : 'left-0.5'}
        `}
      />
    </button>
  </label>
)

// ── Number Input Control ────────────────────────────────────────

const NumberControl: FC<{
  label: string
  value: number | undefined
  placeholder?: string
  onChange: (value: number | undefined) => void
}> = ({ label, value, placeholder, onChange }) => (
  <div>
    <ControlLabel>{label}</ControlLabel>
    <input
      type="number"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-gray-200 outline-none focus:border-gray-400 tabular-nums"
      style={{ borderRadius: 2 }}
      min={0}
    />
  </div>
)

// ── Color Palette ───────────────────────────────────────────────

const PALETTES = [
  { name: 'Monochrome', colors: ['#0E0D0D', '#525252', '#737373', '#a1a1a0', '#d4d4d2'] },
  { name: 'Teal Accent', colors: ['#2A9D8F', '#0E0D0D', '#525252', '#a1a1a0', '#e09f3e'] },
  { name: 'Editorial', colors: CHART_COLORS.slice(0, 5) as unknown as string[] },
]

// ── Format Panel ────────────────────────────────────────────────

const FormatPanel: FC<FormatPanelProps> = ({ sheet, onUpdate }) => {
  const updateConfig = useCallback(
    (updates: Partial<Sheet['config']>) => {
      onUpdate({ ...sheet, config: { ...sheet.config, ...updates } })
    },
    [sheet, onUpdate]
  )

  const numberFormat = sheet.encoding.rows?.format?.type ?? sheet.encoding.columns?.format?.type ?? 'number'

  const updateNumberFormat = useCallback(
    (formatType: string) => {
      const target = sheet.encoding.rows ? 'rows' : 'columns'
      const current = sheet.encoding[target]
      if (!current) return
      onUpdate({
        ...sheet,
        encoding: {
          ...sheet.encoding,
          [target]: {
            ...current,
            format: { ...current.format, type: formatType },
          },
        },
      })
    },
    [sheet, onUpdate]
  )

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200 w-[220px] shrink-0">
      <div className="px-4 py-3 border-b border-gray-200">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Format
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Number Format */}
        <SelectControl
          label="Number Format"
          value={numberFormat}
          options={[
            { value: 'number', label: 'Auto' },
            { value: 'currency', label: 'Currency' },
            { value: 'percent', label: 'Percentage' },
            { value: 'string', label: 'Text' },
          ]}
          onChange={updateNumberFormat}
        />

        {/* Sort */}
        <SelectControl
          label="Sort Order"
          value={sheet.config.sort ? `${sheet.config.sort.field}:${sheet.config.sort.order}` : 'none'}
          options={[
            { value: 'none', label: 'None' },
            { value: 'value:asc', label: 'Value Ascending' },
            { value: 'value:desc', label: 'Value Descending' },
          ]}
          onChange={(v) => {
            if (v === 'none') {
              updateConfig({ sort: undefined })
            } else {
              const [field, order] = v.split(':')
              updateConfig({ sort: { field, order: order as 'asc' | 'desc' } })
            }
          }}
        />

        {/* Top N Limit */}
        <NumberControl
          label="Top N Limit"
          value={sheet.config.limit}
          placeholder="All"
          onChange={(v) => updateConfig({ limit: v })}
        />

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Display Options */}
        <div className="space-y-1">
          <ControlLabel>Display</ControlLabel>
          <ToggleControl
            label="Legend"
            checked={sheet.config.showLegend ?? true}
            onChange={(v) => updateConfig({ showLegend: v })}
          />
          <ToggleControl
            label="Labels"
            checked={sheet.config.showLabels ?? false}
            onChange={(v) => updateConfig({ showLabels: v })}
          />
          {(sheet.markType === 'line' || sheet.markType === 'area') && (
            <ToggleControl
              label="Smooth"
              checked={sheet.config.smooth ?? false}
              onChange={(v) => updateConfig({ smooth: v })}
            />
          )}
          {sheet.markType === 'bar' && (
            <ToggleControl
              label="Stacked"
              checked={sheet.config.stacked ?? false}
              onChange={(v) => updateConfig({ stacked: v })}
            />
          )}
        </div>

        {/* Orientation (Bar only) */}
        {sheet.markType === 'bar' && (
          <SelectControl
            label="Orientation"
            value={sheet.config.orientation ?? 'vertical'}
            options={[
              { value: 'vertical', label: 'Vertical' },
              { value: 'horizontal', label: 'Horizontal' },
            ]}
            onChange={(v) => updateConfig({ orientation: v as 'vertical' | 'horizontal' })}
          />
        )}

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Color Palette */}
        <div>
          <ControlLabel>Color Palette</ControlLabel>
          <div className="space-y-2 mt-1">
            {PALETTES.map((p) => (
              <button
                key={p.name}
                className="w-full flex items-center gap-2 px-2 py-1.5 border border-gray-200 hover:border-gray-400 transition-colors group"
                style={{ borderRadius: 2 }}
              >
                <div className="flex gap-0.5">
                  {p.colors.map((c, i) => (
                    <div
                      key={i}
                      className="w-3 h-3"
                      style={{ backgroundColor: c, borderRadius: 1 }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-mono text-gray-400 group-hover:text-ink transition-colors">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FormatPanel
