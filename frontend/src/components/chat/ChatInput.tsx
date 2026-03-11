import { useState, useRef, useEffect, type FC, type KeyboardEvent } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  isStreaming?: boolean
  onStop?: () => void
}

const ChatInput: FC<ChatInputProps> = ({
  onSend,
  disabled,
  isStreaming,
  onStop,
}) => {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    // Reset height
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
    <div className="border border-gray-200 bg-white">
      <div className="flex items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your data..."
          disabled={disabled || isStreaming}
          rows={1}
          className="flex-1 px-4 py-3 text-sm text-ink bg-transparent resize-none outline-none placeholder:text-gray-400 disabled:opacity-50 leading-relaxed"
        />
        <div className="px-3 py-2">
          {isStreaming ? (
            <button
              onClick={onStop}
              className="font-mono text-[10px] uppercase tracking-wide px-4 py-2 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!value.trim() || disabled}
              className="font-mono text-[10px] uppercase tracking-wide px-4 py-2 bg-gray-900 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              Send
            </button>
          )}
        </div>
      </div>
      <div className="px-4 pb-2">
        <p className="font-mono text-[10px] text-gray-300">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}

export default ChatInput
