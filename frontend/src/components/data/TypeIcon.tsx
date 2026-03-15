import { useState, useRef, useEffect, type FC } from 'react'
import type { ColumnType } from '../../types/datasource'

const TYPE_DISPLAY: Record<ColumnType, { icon: string; label: string }> = {
  number: { icon: '#', label: 'Number' },
  string: { icon: 'Abc', label: 'String' },
  date: { icon: '\u25F4', label: 'Date' },
  boolean: { icon: 'T/F', label: 'Boolean' },
}

interface TypeIconProps {
  type: ColumnType
  onChange?: (type: ColumnType) => void
  size?: 'sm' | 'md'
}

const TypeIcon: FC<TypeIconProps> = ({ type, onChange, size = 'sm' }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const display = TYPE_DISPLAY[type]
  const sizeClasses = size === 'sm'
    ? 'text-[9px] px-1.5 py-0.5'
    : 'text-[10px] px-2 py-1'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (onChange) setOpen(!open)
        }}
        className={`font-mono uppercase ${sizeClasses} border border-transparent hover:border-ds-border-strong transition-colors cursor-pointer ${
          type === 'number' ? 'text-ds-accent bg-ds-accent-glow' : 'text-ds-text-muted bg-ds-surface-alt'
        }`}
        title={`Type: ${display.label}. Click to change.`}
      >
        {display.icon}
      </button>

      {open && onChange && (
        <div className="absolute top-full left-0 mt-1 z-50 border border-ds-border bg-ds-surface min-w-[120px]">
          {(Object.keys(TYPE_DISPLAY) as ColumnType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onChange(t)
                setOpen(false)
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-ds-surface-alt transition-colors ${
                t === type ? 'bg-ds-surface-alt' : ''
              }`}
            >
              <span
                className={`font-mono text-[9px] uppercase px-1.5 py-0.5 ${
                  t === 'number' ? 'text-ds-accent bg-ds-accent-glow' : 'text-ds-text-muted bg-ds-surface-alt'
                }`}
              >
                {TYPE_DISPLAY[t].icon}
              </span>
              <span className="font-mono text-[11px] text-ds-text-muted">
                {TYPE_DISPLAY[t].label}
              </span>
              {t === type && (
                <span className="ml-auto text-[10px] text-ds-text-dim">\u2713</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default TypeIcon
