import { useState, useRef, useEffect, type FC, type KeyboardEvent } from 'react'
import type { ChatMessage, ChatDataContext } from '../../types/chat'
import { useChat } from '../../hooks/useChat'
import Markdown from '../chat/Markdown'

// ── Quick Commands ──────────────────────────────────────────────

const QUICK_COMMANDS = [
  'Make the bar chart horizontal',
  'Add a date filter',
  'Sort by revenue descending',
  'Show top 10 only',
  'Change to a line chart',
  'Add labels to the chart',
]

// ── Message Component ───────────────────────────────────────────

const MessageBubble: FC<{ message: ChatMessage; isStreaming?: boolean }> = ({
  message,
  isStreaming,
}) => {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          max-w-[90%] px-3 py-2 text-xs leading-relaxed
          ${isUser
            ? 'bg-gray-900 text-white'
            : 'bg-white border border-gray-200 text-ink'}
        `}
        style={{ borderRadius: 2 }}
      >
        {!isUser && !message.content && isStreaming && (
          <div className="flex gap-1 py-1">
            <span className="w-1 h-1 bg-gray-300 rounded-full animate-pulse" />
            <span className="w-1 h-1 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        {message.content && (
          <div className="prose prose-xs max-w-none">
            <Markdown content={message.content} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Captain Panel ───────────────────────────────────────────────

interface CaptainPanelProps {
  dataContext: ChatDataContext | null
  existingMessages?: ChatMessage[]
  onCommand?: (command: string) => void
}

const CaptainPanel: FC<CaptainPanelProps> = ({
  dataContext,
  existingMessages,
  onCommand,
}) => {
  const { messages, isStreaming, sendMessage, stopStreaming } = useChat(dataContext)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Initialize with existing messages if provided
  const allMessages = existingMessages?.length ? existingMessages : messages

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [allMessages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    onCommand?.(text)
    sendMessage(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleQuickCommand = (cmd: string) => {
    onCommand?.(cmd)
    sendMessage(cmd)
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2">
        <div className="w-5 h-5 flex items-center justify-center">
          <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0-2.83-2.83M9.76 9.76 6.93 6.93" />
          </svg>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Captain
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {allMessages.length === 0 && (
          <div className="py-6 text-center space-y-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              Ask Captain to modify your dashboard. Try a quick command:
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {QUICK_COMMANDS.slice(0, 4).map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => handleQuickCommand(cmd)}
                  className="px-2.5 py-1 text-[10px] font-mono border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-ink transition-colors"
                  style={{ borderRadius: 2 }}
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        )}

        {allMessages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && msg === allMessages[allMessages.length - 1]}
          />
        ))}
      </div>

      {/* Input */}
      <div className="px-3 py-3 border-t border-gray-200">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Captain..."
            rows={1}
            className="flex-1 resize-none px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 placeholder:text-gray-300 transition-colors"
            style={{ borderRadius: 2 }}
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="px-3 py-2 text-xs font-mono uppercase tracking-wide text-gray-500 border border-gray-200 hover:border-danger hover:text-danger transition-colors shrink-0"
              style={{ borderRadius: 2 }}
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-3 py-2 bg-gray-900 text-white text-xs font-mono uppercase tracking-wide hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              style={{ borderRadius: 2 }}
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CaptainPanel
