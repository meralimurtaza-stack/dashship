import { useState, useEffect, useRef, useMemo, useCallback, type FC } from 'react'
import ChatMessageComponent from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import ConversationStarters from '../components/chat/ConversationStarters'
import DataContextPanel from '../components/chat/DataContextPanel'
import DataChoiceCards from '../components/chat/DataChoiceCards'
import GenerateButton from '../components/chat/GenerateButton'
import { useChatContext } from '../contexts/ChatContext'
import { listDataSources, downloadDataSourceRows } from '../lib/datasource-storage'
import { generateDashboard, type GeneratedDashboard } from '../lib/generate-api'
import { saveDashboard } from '../lib/dashboard-storage'
import { parseFile } from '../engine/parser'
import { detectSchema, generateProfile } from '../engine/profiler'
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
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null)
  const [contextPanelOpen, setContextPanelOpen] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [fieldWarnings, setFieldWarnings] = useState<string[]>([])
  const [dataChoiceLoading, setDataChoiceLoading] = useState(false)

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
    useChatContext()

  // Auto-select source if only one exists
  useEffect(() => {
    if (selectedSource) return
    let cancelled = false
    async function autoSelect() {
      try {
        const data = await listDataSources()
        if (!cancelled && data.length >= 1) {
          setSelectedSource(data[0])
        }
      } catch { /* ok */ }
    }
    autoSelect()
    return () => { cancelled = true }
  }, [selectedSource])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-send initial message from Home page
  const [initialSent, setInitialSent] = useState(false)
  useEffect(() => {
    if (initialMessage && !initialSent && !isStreaming && messages.length === 0) {
      setInitialSent(true)
      sendMessage(initialMessage)
    }
  }, [initialMessage, initialSent, isStreaming, messages.length, sendMessage])

  // ── Sample data / Upload from DataChoiceCards ─────────────────

  const handleUseSampleData = useCallback(async () => {
    setDataChoiceLoading(true)
    try {
      const resp = await fetch('/samples/sales-data.csv')
      const blob = await resp.blob()
      const file = new File([blob], 'sales-data.csv', { type: 'text/csv' })
      const parsed = await parseFile(file)
      const schema = detectSchema(parsed.headers, parsed.rows, file.size, parsed.fileType)
      const profile = generateProfile(schema, parsed.rows)

      const source: DataSource = {
        id: 'sample-sales',
        projectId: '',
        name: 'Sales Data (Sample)',
        fileName: 'sales-data.csv',
        fileType: 'csv',
        fileSizeBytes: file.size,
        storagePath: '',
        schema,
        profile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setSelectedSource(source)

      const dims = schema.columns.filter((c) => c.role === 'dimension').length
      const measures = schema.columns.filter((c) => c.role === 'measure').length
      sendMessage(`I've loaded sample sales data — ${schema.rowCount} rows with ${dims} dimensions and ${measures} measures. What dashboards should I build?`)
    } catch (err) {
      console.error('Failed to load sample data:', err)
    } finally {
      setDataChoiceLoading(false)
    }
  }, [sendMessage])

  const handleUploadData = useCallback(async (file: File) => {
    setDataChoiceLoading(true)
    try {
      const parsed = await parseFile(file)
      const schema = detectSchema(parsed.headers, parsed.rows, file.size, parsed.fileType)
      const profile = generateProfile(schema, parsed.rows)

      const source: DataSource = {
        id: `local-${Date.now()}`,
        projectId: '',
        name: file.name.replace(/\.[^.]+$/, ''),
        fileName: file.name,
        fileType: parsed.fileType,
        fileSizeBytes: file.size,
        storagePath: '',
        schema,
        profile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setSelectedSource(source)

      const dims = schema.columns.filter((c) => c.role === 'dimension').length
      const measures = schema.columns.filter((c) => c.role === 'measure').length
      sendMessage(`I've loaded ${file.name} — ${schema.rowCount} rows with ${dims} dimensions and ${measures} measures. What dashboards should I build?`)
    } catch (err) {
      console.error('Failed to process uploaded file:', err)
    } finally {
      setDataChoiceLoading(false)
    }
  }, [sendMessage])

  // ── Generate ──────────────────────────────────────────────────

  const buildSummary = useCallback((): string => {
    return messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Captain'}: ${m.content}`)
      .join('\n\n')
  }, [messages])

  const handleGenerate = useCallback(async () => {
    if (!dataContext || !selectedSource || isGenerating) return
    setIsGenerating(true)
    setGenerateError(null)
    setFieldWarnings([])

    try {
      const summary = buildSummary()
      const result = await generateDashboard(dataContext, summary)

      if (result.warnings.length > 0) {
        setFieldWarnings(result.warnings)
      }

      // Download and parse the actual data
      let rows: Record<string, unknown>[] = []
      if (selectedSource.storagePath) {
        rows = await downloadDataSourceRows(selectedSource.storagePath, selectedSource.fileName)
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
          chatMessages: messages,
          dataContext,
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
  }, [dataContext, selectedSource, isGenerating, buildSummary, onDashboardGenerated, messages])

  const hasMessages = messages.length > 0
  const canGenerate = hasMessages && !isStreaming && !!dataContext

  return (
    <div className="h-full flex">
      <div className={`flex-1 min-w-0 flex flex-col ${contextPanelOpen ? '' : 'max-w-full'}`}>
        {/* Header */}
        <div className="px-5 py-3 border-b border-ds-border bg-ds-surface flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div>
              {dataContext ? (
                <>
                  <p className="font-mono text-xs font-medium text-ds-text">{dataContext.sourceName}</p>
                  <p className="font-mono text-[10px] text-ds-text-dim tabular-nums">
                    {dataContext.rowCount.toLocaleString()} rows &middot; {dataContext.columns.length} fields
                  </p>
                </>
              ) : (
                <>
                  <p className="font-mono text-xs font-medium text-ds-text">Captain</p>
                  <p className="font-mono text-[10px] text-ds-text-dim">No data source yet</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMessages && (
              <button
                onClick={() => { clearMessages(); setGenerateError(null); setFieldWarnings([]) }}
                className="font-mono text-[10px] uppercase tracking-wide text-ds-text-dim hover:text-ds-text px-3 py-1.5 transition-colors"
              >
                New Chat
              </button>
            )}
            {!contextPanelOpen && dataContext && (
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
          dataContext ? (
            <ConversationStarters dataContext={dataContext} onSend={sendMessage} />
          ) : (
            <div className="flex-1 flex items-center justify-center px-5">
              <div className="max-w-md text-center space-y-3">
                <p className="font-mono text-xs font-medium text-ds-text">Tell Captain what you want to build</p>
                <p className="font-sans text-[13px] text-ds-text-muted">Captain will help you choose data and plan your dashboard.</p>
              </div>
            </div>
          )
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

              {/* Data choice cards — shown after first assistant response when no data */}
              {!selectedSource && hasMessages && !isStreaming && (
                <DataChoiceCards
                  onUseSampleData={handleUseSampleData}
                  onUploadData={handleUploadData}
                  loading={dataChoiceLoading}
                />
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Field warnings */}
        {fieldWarnings.length > 0 && (
          <div className="shrink-0 px-5 pb-2">
            <div className="max-w-2xl mx-auto">
              <div
                className="border px-4 py-3 space-y-2"
                style={{ background: 'rgba(184,134,11,0.06)', borderColor: 'rgba(184,134,11,0.2)' }}
              >
                <p className="font-mono text-[11px] uppercase tracking-wide text-ds-warning">
                  {fieldWarnings.length} field issue{fieldWarnings.length > 1 ? 's' : ''} detected
                </p>
                <ul className="space-y-1">
                  {fieldWarnings.map((w, i) => (
                    <li key={i} className="font-sans text-xs text-ds-text-muted">{w}</li>
                  ))}
                </ul>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setFieldWarnings([])}
                    className="font-mono text-[10px] uppercase tracking-wide text-ds-text-muted border border-ds-border px-3 py-1.5 hover:border-ds-accent hover:text-ds-text transition-colors"
                  >
                    Continue anyway
                  </button>
                  <button
                    onClick={() => { setFieldWarnings([]); handleGenerate() }}
                    className="font-mono text-[10px] uppercase tracking-wide bg-ds-accent text-white px-3 py-1.5 hover:bg-ds-accent-hover transition-colors"
                  >
                    Fix and regenerate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generate button */}
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
            <ChatInput onSend={sendMessage} disabled={false} isStreaming={isStreaming} onStop={stopStreaming} />
          </div>
        </div>
      </div>

      {contextPanelOpen && dataContext && (
        <div className="w-72 shrink-0">
          <DataContextPanel dataContext={dataContext} onCollapse={() => setContextPanelOpen(false)} />
        </div>
      )}
    </div>
  )
}

export default ChatPage
