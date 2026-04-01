import { useState, useRef, type FC, type KeyboardEvent } from 'react'
import { ArrowIcon } from '../icons'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  isStreaming?: boolean
  onStop?: () => void
  placeholder?: string
}

const ChatInput: FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  isStreaming = false,
  onStop,
  placeholder = 'Ask about your data...',
}) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <div
        className="flex items-end gap-2"
        style={{
          border: '0.5px solid rgba(0,0,0,0.10)',
          borderRadius: '20px',
          padding: '10px 14px',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          background: 'var(--color-ds-surface)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.18)'
        }}
        onMouseLeave={(e) => {
          if (!e.currentTarget.contains(document.activeElement)) {
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)'
          }
        }}
        onFocusCapture={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.22)'
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)'
        }}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)'
            e.currentTarget.style.boxShadow = 'none'
          }
        }}
      >
        {/* Attach button */}
        <button
          className="shrink-0 flex items-center justify-center text-ds-text-muted hover:text-ds-text transition-colors"
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '9999px',
            border: '0.5px solid rgba(0,0,0,0.10)',
            background: 'transparent',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            // Auto-resize
            e.target.style.height = 'auto'
            e.target.style.height = e.target.scrollHeight + 'px'
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isStreaming}
          rows={1}
          className="flex-1 text-ds-text bg-transparent resize-none outline-none placeholder:text-ds-text-dim disabled:opacity-50"
          style={{
            fontSize: '12.5px',
            fontFamily: 'var(--font-sans)',
            lineHeight: '1.4',
            minHeight: '18px',
            maxHeight: '120px',
            border: 'none',
            padding: '0',
          }}
        />

        {/* Send / Stop button */}
        {isStreaming ? (
          <button
            onClick={onStop}
            className="shrink-0 flex items-center justify-center"
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '9999px',
              border: '0.5px solid rgba(0,0,0,0.10)',
              background: 'transparent',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-ds-text-muted">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className="shrink-0 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '9999px',
              background: 'var(--color-ds-text)',
              border: 'none',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            <ArrowIcon size={12} className="text-ds-bg" />
          </button>
        )}
      </div>

      {/* Hint */}
      <p
        className="text-ds-text-dim text-center"
        style={{
          fontSize: '9px',
          marginTop: '4px',
        }}
      >
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  )
}

export default ChatInput
