import { useState, useEffect, useRef, useMemo, type FC } from 'react'
import ChatMessageComponent from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import ConversationStarters from '../components/chat/ConversationStarters'
import DataContextPanel from '../components/chat/DataContextPanel'
import { useChat } from '../hooks/useChat'
import { listDataSources } from '../lib/datasource-storage'
import type { DataSource } from '../types/datasource'
import type { ChatDataContext } from '../types/chat'

// ── Data Source Selector ────────────────────────────────────────

const SourceSelector: FC<{
  sources: DataSource[]
  loading: boolean
  onSelect: (source: DataSource) => void
}> = ({ sources, loading, onSelect }) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-2 h-2 bg-gray-900 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-gray-500">
              Loading data sources...
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (sources.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 px-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            No Data Sources
          </p>
          <h2 className="font-mono text-2xl font-semibold text-ink leading-tight">
            Upload data first.
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Go to the Data tab to upload a CSV or Excel file. Once saved, you
            can start planning your dashboard here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="max-w-lg w-full space-y-6 px-6">
        <div className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Plan Dashboard
          </p>
          <h2 className="font-mono text-2xl font-semibold text-ink leading-tight">
            Choose a data source.
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Select a dataset to start planning your dashboard with AI.
          </p>
        </div>

        <div className="space-y-2">
          {sources.map((source) => {
            const dims = source.schema.columns.filter(
              (c) => c.role === 'dimension'
            ).length
            const meas = source.schema.columns.filter(
              (c) => c.role === 'measure'
            ).length

            return (
              <button
                key={source.id}
                onClick={() => onSelect(source)}
                className="w-full text-left border border-gray-200 bg-white px-4 py-3 hover:border-gray-900 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm font-medium text-ink">
                      {source.name}
                    </p>
                    <p className="font-mono text-[10px] text-gray-400 mt-1 tabular-nums">
                      {source.schema.rowCount.toLocaleString()} rows &middot;{' '}
                      {dims}D {meas}M &middot;{' '}
                      {source.fileType.toUpperCase()}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-300 group-hover:text-gray-900 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Main Chat Page ──────────────────────────────────────────────

const ChatPage: FC = () => {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loadingSources, setLoadingSources] = useState(true)
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null)
  const [contextPanelOpen, setContextPanelOpen] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Build data context from selected source
  const dataContext: ChatDataContext | null = useMemo(() => {
    if (!selectedSource) return null
    return {
      sourceId: selectedSource.id,
      sourceName: selectedSource.name,
      rowCount: selectedSource.schema.rowCount,
      columns: selectedSource.schema.columns
        .filter((c) => !c.hidden)
        .map((c) => ({
          name: c.name,
          displayName: c.displayName || null,
          type: c.type,
          role: c.role,
          sampleValues: c.sampleValues,
        })),
    }
  }, [selectedSource])

  const { messages, isStreaming, sendMessage, stopStreaming, clearMessages } =
    useChat(dataContext)

  // Load data sources from Supabase
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await listDataSources()
        if (!cancelled) setSources(data)
      } catch {
        // Silently fail — user just sees empty state
      } finally {
        if (!cancelled) setLoadingSources(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleBack = () => {
    setSelectedSource(null)
    clearMessages()
    setContextPanelOpen(true)
  }

  // No source selected — show selector
  if (!selectedSource || !dataContext) {
    return (
      <div className="h-full flex flex-col">
        <SourceSelector
          sources={sources}
          loading={loadingSources}
          onSelect={setSelectedSource}
        />
      </div>
    )
  }

  const hasMessages = messages.length > 0

  return (
    <div className="h-full flex">
      {/* Chat area */}
      <div
        className={`flex-1 min-w-0 flex flex-col ${
          contextPanelOpen ? '' : 'max-w-full'
        }`}
      >
        {/* Chat header */}
        <div className="px-5 py-3 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-1 hover:opacity-60 transition-opacity"
              aria-label="Back to sources"
            >
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                />
              </svg>
            </button>
            <div>
              <p className="font-mono text-xs font-medium text-ink">
                {dataContext.sourceName}
              </p>
              <p className="font-mono text-[10px] text-gray-400 tabular-nums">
                {dataContext.rowCount.toLocaleString()} rows &middot;{' '}
                {dataContext.columns.length} fields
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasMessages && (
              <button
                onClick={() => {
                  clearMessages()
                }}
                className="font-mono text-[10px] uppercase tracking-wide text-gray-400 hover:text-gray-900 px-3 py-1.5 transition-colors"
              >
                New Chat
              </button>
            )}
            {!contextPanelOpen && (
              <button
                onClick={() => setContextPanelOpen(true)}
                className="font-mono text-[10px] uppercase tracking-wide text-gray-400 hover:text-gray-900 px-3 py-1.5 border border-gray-200 hover:border-gray-900 transition-colors"
              >
                Data
              </button>
            )}
          </div>
        </div>

        {/* Messages or starters */}
        {!hasMessages ? (
          <ConversationStarters
            dataContext={dataContext}
            onSend={sendMessage}
          />
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.map((msg, i) => {
                // Only the last assistant message gets interactive calc cards
                const isLastAssistant =
                  msg.role === 'assistant' &&
                  !isStreaming &&
                  i === messages.length - 1

                return (
                  <ChatMessageComponent
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreaming && i === messages.length - 1}
                    onCalcAction={isLastAssistant ? sendMessage : undefined}
                  />
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 px-5 pb-4 pt-2">
          <div className="max-w-2xl mx-auto">
            <ChatInput
              onSend={sendMessage}
              disabled={!dataContext}
              isStreaming={isStreaming}
              onStop={stopStreaming}
            />
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
  )
}

export default ChatPage
