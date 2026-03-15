import { useState, useEffect, useRef, useMemo, useCallback, type FC } from 'react'
import ChatMessageComponent from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import ConversationStarters from '../components/chat/ConversationStarters'
import DataContextPanel from '../components/chat/DataContextPanel'
import SourceSelector from '../components/chat/SourceSelector'
import GenerateButton from '../components/chat/GenerateButton'
import { useChat } from '../hooks/useChat'
import { listDataSources, downloadDataSourceRows } from '../lib/datasource-storage'
import { generateDashboard, type GeneratedDashboard } from '../lib/generate-api'
import { saveDashboard } from '../lib/dashboard-storage'
import type { DataSource } from '../types/datasource'
import type { ChatMessage, ChatDataContext } from '../types/chat'
import type { ColumnSchema } from '../types/datasource'

// ── Props ────────────────────────────────────────────────────────

interface ChatPageProps {
  onDashboardGenerated?: (
    dashboard: GeneratedDashboard,
    data: Record<string, unknown>[],
    columns: ColumnSchema[],
    dataContext: ChatDataContext | null,
    chatMessages: ChatMessage[],
    dashboardId?: string
  ) => void
  initialMessage?: string | null
}

// ── Main Chat Page ──────────────────────────────────────────────

const ChatPage: FC<ChatPageProps> = ({ onDashboardGenerated, initialMessage }) => {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loadingSources, setLoadingSources] = useState(true)
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null)
  const [contextPanelOpen, setContextPanelOpen] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await listDataSources()
        if (!cancelled) setSources(data)
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoadingSources(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-send initial message from Home page
  const [initialSent, setInitialSent] = useState(false)
  useEffect(() => {
    if (initialMessage && !initialSent && selectedSource && dataContext && !isStreaming && messages.length === 0) {
      setInitialSent(true)
      sendMessage(initialMessage)
    }
  }, [initialMessage, initialSent, selectedSource, dataContext, isStreaming, messages.length, sendMessage])

  const handleBack = () => {
    setSelectedSource(null)
    clearMessages()
    setContextPanelOpen(true)
    setGenerateError(null)
  }

  const buildSummary = useCallback((): string => {
    return messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Captain'}: ${m.content}`)
      .join('\n\n')
  }, [messages])

  const handleGenerate = useCallback(async () => {
    if (!dataContext || !selectedSource || isGenerating) return
    setIsGenerating(true)
    setGenerateError(null)

    try {
      // 1. Generate dashboard structure from Claude
      const summary = buildSummary()
      console.log('[ChatPage] Generating dashboard...')
      const result = await generateDashboard(dataContext, summary)
      console.log('[ChatPage] Dashboard generated:', result.dashboard.sheets.length, 'sheets')
      if (result.warnings.length > 0) {
        console.warn('[ChatPage] Generation warnings:', result.warnings)
      }

      // 2. Download and parse the actual data from Supabase Storage
      console.log('[ChatPage] Loading data from:', selectedSource.storagePath)
      const rows = await downloadDataSourceRows(
        selectedSource.storagePath,
        selectedSource.fileName
      )
      console.log('[ChatPage] Data loaded:', rows.length, 'rows')
      if (rows.length > 0) {
        console.log('[ChatPage] Sample row keys:', Object.keys(rows[0]))
        console.log('[ChatPage] First row:', rows[0])
      }

      // 3. Log sheet field names vs actual data columns for debugging
      const dataColumns = rows.length > 0 ? new Set(Object.keys(rows[0])) : new Set<string>()
      for (const sheet of result.dashboard.sheets) {
        const sheetFields: string[] = []
        const enc = sheet.encoding
        if (enc.columns) sheetFields.push(enc.columns.field)
        if (enc.rows) sheetFields.push(enc.rows.field)
        if (enc.color) sheetFields.push(enc.color.field)
        const missing = sheetFields.filter((f) => !dataColumns.has(f))
        if (missing.length > 0) {
          console.warn(`[ChatPage] Sheet "${sheet.name}" references missing fields:`, missing)
        }
      }

      const columns = selectedSource.schema.columns.filter((c) => !c.hidden)

      // Save as draft
      let dashboardId: string | undefined
      try {
        const saved = await saveDashboard({
          dataSourceId: selectedSource.id,
          name: result.dashboard.name,
          sheets: result.dashboard.sheets,
          layout: result.dashboard.layout,
          data: rows,
        })
        dashboardId = saved.id
      } catch (err) {
        console.warn('[ChatPage] Failed to save draft:', err)
      }

      onDashboardGenerated?.(result.dashboard, rows, columns, dataContext, messages, dashboardId)
    } catch (err) {
      console.error('[ChatPage] Generation failed:', err)
      setGenerateError((err as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }, [dataContext, selectedSource, isGenerating, buildSummary, onDashboardGenerated])

  if (!selectedSource || !dataContext) {
    return (
      <div className="h-full flex flex-col">
        <SourceSelector sources={sources} loading={loadingSources} onSelect={setSelectedSource} />
      </div>
    )
  }

  const hasMessages = messages.length > 0
  const canGenerate = hasMessages && !isStreaming

  return (
    <div className="h-full flex">
      <div className={`flex-1 min-w-0 flex flex-col ${contextPanelOpen ? '' : 'max-w-full'}`}>
        {/* Header */}
        <div className="px-5 py-3 border-b border-ds-border bg-ds-surface flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="p-1 hover:opacity-60 transition-opacity" aria-label="Back to sources">
              <svg className="w-4 h-4 text-ds-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div>
              <p className="font-mono text-xs font-medium text-ds-text">{dataContext.sourceName}</p>
              <p className="font-mono text-[10px] text-ds-text-dim tabular-nums">
                {dataContext.rowCount.toLocaleString()} rows &middot; {dataContext.columns.length} fields
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMessages && (
              <button
                onClick={() => { clearMessages(); setGenerateError(null) }}
                className="font-mono text-[10px] uppercase tracking-wide text-ds-text-dim hover:text-ds-text px-3 py-1.5 transition-colors"
              >
                New Chat
              </button>
            )}
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

        {/* Messages or starters */}
        {!hasMessages ? (
          <ConversationStarters dataContext={dataContext} onSend={sendMessage} />
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.map((msg, i) => {
                const isLastAssistant = msg.role === 'assistant' && !isStreaming && i === messages.length - 1
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

        {/* Generate button — clear next step */}
        {canGenerate && (
          <div className="shrink-0 px-5 pb-2">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3">
                <GenerateButton isGenerating={isGenerating} disabled={!canGenerate} onClick={handleGenerate} />
                {!isGenerating && !generateError && (
                  <span className="font-mono text-[10px] text-ds-text-dim flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                    Next step
                  </span>
                )}
              </div>
              {generateError && (
                <p className="font-mono text-[10px] text-ds-error mt-2">{generateError}</p>
              )}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 px-5 pb-4 pt-2">
          <div className="max-w-2xl mx-auto">
            <ChatInput onSend={sendMessage} disabled={!dataContext} isStreaming={isStreaming} onStop={stopStreaming} />
          </div>
        </div>
      </div>

      {contextPanelOpen && (
        <div className="w-72 shrink-0">
          <DataContextPanel dataContext={dataContext} onCollapse={() => setContextPanelOpen(false)} />
        </div>
      )}
    </div>
  )
}

export default ChatPage
