import { useState, useRef, type FC, type KeyboardEvent } from 'react'

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
  placeholder = 'Ask The Captain to refine your dashboard...',
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
    <div>
      <div
        className="glass-panel p-2 rounded-2xl border shadow-2xl flex items-center gap-2 ring-1 ring-black/5"
        style={{ borderColor: 'rgba(255,255,255,0.6)' }}
      >
        {/* Attach button */}
        <button
          className="p-3 transition-colors"
          style={{ color: 'var(--color-lp-outline)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-lp-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-lp-outline)' }}
        >
          <span className="material-symbols-outlined">add_circle</span>
        </button>

        {/* Input */}
        <input
          ref={textareaRef as unknown as React.RefObject<HTMLInputElement>}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown as unknown as React.KeyboardEventHandler<HTMLInputElement>}
          placeholder={placeholder}
          disabled={disabled || isStreaming}
          className="flex-grow bg-transparent border-none focus:ring-0 text-base placeholder:text-stone-400 disabled:opacity-50"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-lp-on-surface)',
            outline: 'none',
          }}
        />

        {/* Send / Stop */}
        {isStreaming ? (
          <button
            onClick={onStop}
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-all"
            style={{
              border: '1px solid var(--color-lp-outline-variant)',
              color: 'var(--color-lp-on-surface-variant)',
            }}
          >
            <span className="material-symbols-outlined text-lg">stop</span>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            className="w-12 h-12 rounded-xl flex items-center justify-center hover:scale-[1.02] active:scale-95 transition-all shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--color-lp-primary)' }}
          >
            <span className="material-symbols-outlined text-white">send</span>
          </button>
        )}
      </div>

      {/* Action bar below input */}
      <div className="mt-3 flex justify-center gap-8">
        <span
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold cursor-pointer transition-colors"
          style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-outline)' }}
        >
          <span className="material-symbols-outlined text-[16px]">history</span>
          History
        </span>
        <span
          className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold cursor-pointer transition-opacity hover:opacity-80"
          style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-primary)' }}
        >
          <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
          Generate Bridge
        </span>
      </div>
    </div>
  )
}

export default ChatInput
