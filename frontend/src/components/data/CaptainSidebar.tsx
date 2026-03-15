import { useState, useRef, useEffect, type FC, type KeyboardEvent } from 'react'
import type { ChatMessage, ChatDataContext } from '../../types/chat'
import Markdown from '../chat/Markdown'

// ── Message Bubble ──────────────────────────────────────────

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
            ? 'bg-ds-accent text-white'
            : 'bg-ds-surface border border-ds-border text-ds-text'}
        `}
      >
        {!isUser && !message.content && isStreaming && (
          <div className="flex gap-1 py-1">
            <span className="w-1 h-1 bg-ds-text-dim animate-pulse" />
            <span className="w-1 h-1 bg-ds-text-dim animate-pulse" style={{ animationDelay: '150ms' }} />
            <span className="w-1 h-1 bg-ds-text-dim animate-pulse" style={{ animationDelay: '300ms' }} />
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

// ── Captain Sidebar ─────────────────────────────────────────

interface CaptainSidebarProps {
  messages: ChatMessage[]
  isStreaming: boolean
  dataContext: ChatDataContext | null
  onSend: (message: string) => void
  onStop: () => void
  onExpand: () => void
  onGenerate?: () => void
  isGenerating?: boolean
  collapsed: boolean
  onToggleCollapse: () => void
}

const CaptainSidebar: FC<CaptainSidebarProps> = ({
  messages,
  isStreaming,
  onSend,
  onStop,
  onExpand,
  onGenerate,
  isGenerating,
  collapsed,
  onToggleCollapse,
}) => {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    onSend(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasMessages = messages.length > 0
  const canGenerate = hasMessages && !isStreaming && !isGenerating

  if (collapsed) {
    return (
      <div className="w-10 border-l border-ds-border bg-ds-bg flex flex-col items-center pt-3 shrink-0">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-ds-text-dim hover:text-ds-text transition-colors"
          title="Expand Captain"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0-2.83-2.83M9.76 9.76 6.93 6.93" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="w-[350px] border-l border-ds-border bg-ds-surface flex flex-col shrink-0">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-ds-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-ds-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0-2.83-2.83M9.76 9.76 6.93 6.93" />
          </svg>
          <span className="micro-label">
            Captain
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Expand to full page */}
          <button
            onClick={onExpand}
            className="p-1.5 text-ds-text-dim hover:text-ds-text transition-colors"
            title="Expand to full page"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          </button>
          {/* Collapse */}
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-ds-text-dim hover:text-ds-text transition-colors"
            title="Collapse panel"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-xs text-ds-text-dim leading-relaxed">
              Captain is analyzing your data...
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && msg === messages[messages.length - 1]}
          />
        ))}
      </div>

      {/* Generate Dashboard button */}
      {canGenerate && onGenerate && (
        <div className="px-3 pb-2">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-ds-accent text-white font-mono text-[10px] uppercase tracking-wide px-4 py-2.5 hover:bg-ds-accent-hover transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-white animate-pulse" />
                  <div className="w-1 h-1 bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
                </div>
                Building dashboard...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
                </svg>
                Generate Dashboard
              </>
            )}
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-ds-border">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Captain..."
            rows={1}
            className="flex-1 resize-none px-3 py-2 text-xs font-mono bg-ds-surface-alt border border-ds-border outline-none focus:border-ds-accent placeholder:text-ds-text-dim transition-colors"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <button
              onClick={onStop}
              className="px-3 py-2 text-xs font-mono uppercase tracking-wide text-ds-text-muted border border-ds-border hover:border-ds-accent hover:text-ds-text transition-colors shrink-0"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="px-3 py-2 bg-ds-accent text-white text-xs font-mono uppercase tracking-wide hover:bg-ds-accent-hover disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CaptainSidebar
