import { useState, useRef, useEffect, type FC, type KeyboardEvent } from 'react'
import ChatMessageComponent from '../chat/ChatMessage'
import DataContextPanel from '../chat/DataContextPanel'
import type { ChatMessage, ChatDataContext } from '../../types/chat'

// ── Props ───────────────────────────────────────────────────

interface CaptainFullPageProps {
  messages: ChatMessage[]
  isStreaming: boolean
  dataContext: ChatDataContext
  onSend: (message: string) => void
  onStop: () => void
  onMinimize: () => void
  onGenerate?: () => void
  isGenerating?: boolean
}

// ── Component ───────────────────────────────────────────────

const CaptainFullPage: FC<CaptainFullPageProps> = ({
  messages,
  isStreaming,
  dataContext,
  onSend,
  onStop,
  onMinimize,
  onGenerate,
  isGenerating,
}) => {
  const [input, setInput] = useState('')
  const [contextPanelOpen, setContextPanelOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    onSend(text)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const hasMessages = messages.length > 0
  const canGenerate = hasMessages && !isStreaming && !isGenerating

  return (
    <div className="fixed inset-0 z-40 bg-ds-bg flex flex-col">
      {/* Header */}
      <div className="h-11 px-5 flex items-center justify-between border-b border-ds-border bg-ds-surface shrink-0">
        <div className="flex items-center gap-3">
          {/* Minimize button */}
          <button
            onClick={onMinimize}
            className="p-1 hover:opacity-60 transition-opacity"
            aria-label="Minimize to sidebar"
          >
            <svg className="w-4 h-4 text-ds-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-ds-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0-2.83-2.83M9.76 9.76 6.93 6.93" />
            </svg>
            <span className="font-mono text-xs font-medium text-ds-text">Captain</span>
          </div>
          <span className="font-mono text-[10px] text-ds-text-dim">
            {dataContext.sourceName} &middot; {dataContext.rowCount.toLocaleString()} rows
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!contextPanelOpen && (
            <button
              onClick={() => setContextPanelOpen(true)}
              className="font-mono text-[10px] uppercase tracking-wide text-ds-text-dim hover:text-ds-text px-3 py-1.5 border border-ds-border hover:border-ds-accent transition-colors"
            >
              Data
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.map((msg, i) => (
                <ChatMessageComponent
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && i === messages.length - 1}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Generate button */}
          {canGenerate && onGenerate && (
            <div className="shrink-0 px-5 pb-2">
              <div className="max-w-2xl mx-auto">
                <button
                  onClick={onGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 bg-ds-accent text-white font-mono text-xs uppercase tracking-wide px-6 py-3 hover:bg-ds-accent-hover transition-colors disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-white animate-pulse" />
                        <div className="w-1.5 h-1.5 bg-white animate-pulse" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-white animate-pulse" style={{ animationDelay: '300ms' }} />
                      </div>
                      Building dashboard...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5" />
                      </svg>
                      Generate Dashboard
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="shrink-0 px-5 pb-4 pt-2">
            <div className="max-w-2xl mx-auto">
              <div className="border border-ds-border bg-ds-surface">
                <div className="flex items-end">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your data..."
                    disabled={isStreaming}
                    rows={1}
                    className="flex-1 px-4 py-3 text-sm text-ds-text bg-transparent resize-none outline-none placeholder:text-ds-text-dim disabled:opacity-50 leading-relaxed"
                  />
                  <div className="px-3 py-2">
                    {isStreaming ? (
                      <button
                        onClick={onStop}
                        className="font-mono text-[10px] uppercase tracking-wide px-4 py-2 border border-ds-accent text-ds-text hover:bg-ds-accent hover:text-white transition-colors"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="font-mono text-[10px] uppercase tracking-wide px-4 py-2 bg-ds-accent text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-ds-accent-hover transition-colors"
                      >
                        Send
                      </button>
                    )}
                  </div>
                </div>
                <div className="px-4 pb-2">
                  <p className="font-mono text-[10px] text-ds-text-dim">
                    Enter to send &middot; Shift+Enter for newline
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data context panel */}
        {contextPanelOpen && (
          <div className="w-72 shrink-0">
            <DataContextPanel
              dataContext={dataContext}
              onCollapse={() => setContextPanelOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default CaptainFullPage
