import type { FC } from 'react'
import type { Sheet } from '../../types/sheet'

type MarkType = Sheet['markType']

const MARK_TYPES: Array<{ type: MarkType; label: string; icon: string }> = [
  { type: 'bar', label: 'Bar', icon: 'M4 5v14h16v-2H6v-2h4V9H6V7h6v6h2V5h-2v2H6V5H4zm8 0v8h4v4h4V5h-8z' },
  { type: 'line', label: 'Line', icon: 'M3 17l4-4 4 4 4-8 4 4' },
  { type: 'area', label: 'Area', icon: 'M3 17l4-4 4 4 4-8 4 4v4H3z' },
  { type: 'scatter', label: 'Scatter', icon: '' },
  { type: 'pie', label: 'Pie', icon: '' },
  { type: 'table', label: 'Table', icon: '' },
]

const MarkIcon: FC<{ type: MarkType; active: boolean }> = ({ type, active }) => {
  const cls = `w-4 h-4 ${active ? 'text-white' : 'text-gray-500'}`

  switch (type) {
    case 'bar':
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
          <rect x="1" y="8" width="3" height="7" />
          <rect x="5" y="4" width="3" height="11" />
          <rect x="9" y="6" width="3" height="9" />
          <rect x="13" y="2" width="3" height="13" />
        </svg>
      )
    case 'line':
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="1,12 5,6 9,10 15,3" />
        </svg>
      )
    case 'area':
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor" opacity={0.3}>
          <polygon points="1,12 5,6 9,10 15,3 15,15 1,15" />
          <polyline points="1,12 5,6 9,10 15,3" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="1" />
        </svg>
      )
    case 'scatter':
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
          <circle cx="3" cy="10" r="1.5" />
          <circle cx="6" cy="5" r="1.5" />
          <circle cx="10" cy="8" r="1.5" />
          <circle cx="13" cy="3" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
        </svg>
      )
    case 'pie':
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1A7 7 0 108 15 7 7 0 008 1zm0 1.2V8h5.8A5.8 5.8 0 008 2.2z" />
        </svg>
      )
    case 'table':
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1">
          <rect x="1" y="2" width="14" height="12" rx="1" />
          <line x1="1" y1="6" x2="15" y2="6" />
          <line x1="1" y1="10" x2="15" y2="10" />
          <line x1="6" y1="2" x2="6" y2="14" />
        </svg>
      )
    default:
      return null
  }
}

interface MarkTypeSelectorProps {
  value: MarkType
  onChange: (type: MarkType) => void
}

const MarkTypeSelector: FC<MarkTypeSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-gray-100" style={{ borderRadius: 2 }}>
      {MARK_TYPES.map(({ type, label }) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`
            flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wide
            transition-colors
            ${value === type
              ? 'bg-gray-900 text-white'
              : 'text-gray-500 hover:text-gray-900 hover:bg-white'}
          `}
          style={{ borderRadius: 2 }}
          title={label}
        >
          <MarkIcon type={type} active={value === type} />
          {label}
        </button>
      ))}
    </div>
  )
}

export default MarkTypeSelector
