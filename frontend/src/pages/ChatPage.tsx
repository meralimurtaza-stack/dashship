import { useState, useEffect, useRef, useMemo, useCallback, type FC } from 'react'
import ChatMessageComponent from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import ConversationStarters from '../components/chat/ConversationStarters'
import DataContextPanel from '../components/chat/DataContextPanel'
import DataChoiceCards from '../components/chat/DataChoiceCards'
import PlanPanel from '../components/plan/PlanPanel'
import { useChatContext } from '../contexts/ChatContext'
import { usePlanSpec } from '../hooks/usePlanSpec'
import { specToDashboard } from '../utils/spec-to-dashboard'
import { listDataSources, downloadDataSourceRows } from '../lib/datasource-storage'
import { generateDashboard, type GeneratedDashboard } from '../lib/generate-api'
import { saveDashboard } from '../lib/dashboard-storage'
import { parseFile } from '../engine/parser'
import { detectSchema, generateProfile } from '../engine/profiler'
import type { DataSource } from '../types/datasource'
import type { ChatMessage, ChatDataContext } from '../types/chat'
import type { ColumnSchema } from '../types/datasource'
import type { InsightData, InsightBarItem } from '../utils/insight-parser'

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
  dashboardId?: string | null
}

// ── Main Chat Page ──────────────────────────────────────────────

const ChatPage: FC<ChatPageProps> = ({ onDashboardGenerated, initialMessage, dashboardId }) => {
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null)
  const [contextPanelOpen, setContextPanelOpen] = useState(true)
  const [planPanelOpen, setPlanPanelOpen] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
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

  // Plan spec state
  const { spec, applyDelta, fieldWarnings: planFieldWarnings, isValid, reset: resetSpec } = usePlanSpec(dashboardId ?? null)

  // Initialize data profile on spec when data context becomes available
  const profileInitRef = useRef(false)
  useEffect(() => {
    if (!dataContext || profileInitRef.current) return
    profileInitRef.current = true
    resetSpec({
      ...spec,
      dataProfile: {
        source: dataContext.sourceName,
        rows: dataContext.rowCount,
        fields: dataContext.columns.map(c => ({
          name: c.name,
          type: c.type,
          subtype: c.role,
        })),
      },
    })
    // Only run when dataContext first becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataContext])

  const { messages, isStreaming, sendMessage, stopStreaming, clearMessages, lastDeltas } =
    useChatContext()

  // Apply deltas from Captain responses
  const appliedDeltasRef = useRef<object | null>(null)
  useEffect(() => {
    if (lastDeltas.length > 0 && lastDeltas !== appliedDeltasRef.current) {
      appliedDeltasRef.current = lastDeltas
      for (const delta of lastDeltas) {
        applyDelta(delta)
      }
    }
  }, [lastDeltas, applyDelta])

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

  // ── Generate from plan spec ────────────────────────────────────

  const handlePlanGenerate = useCallback(async () => {
    if (!dataContext || !selectedSource || isGenerating) return
    setIsGenerating(true)
    setGenerateError(null)

    try {
      const dashboardConfig = specToDashboard(spec)

      // Download and parse the actual data
      let rows: Record<string, unknown>[] = []
      if (selectedSource.storagePath) {
        rows = await downloadDataSourceRows(selectedSource.storagePath, selectedSource.fileName)
      }

      const columns = selectedSource.schema.columns.filter((c) => !c.hidden)

      // Set dataSourceId on each sheet
      const sheets = dashboardConfig.sheets.map((s) => ({
        ...s,
        dataSourceId: selectedSource.id,
        projectId: '',
      }))

      const dashboard: GeneratedDashboard = {
        name: dashboardConfig.name,
        sheets: sheets as unknown as GeneratedDashboard['sheets'],
        layout: dashboardConfig.layout,
      }

      // Save as draft
      let savedId: string | undefined
      try {
        const saved = await saveDashboard({
          dataSourceId: selectedSource.id,
          name: dashboardConfig.name,
          sheets: sheets as unknown as GeneratedDashboard['sheets'],
          layout: dashboardConfig.layout,
          data: rows,
          chatMessages: messages,
          dataContext,
        })
        savedId = saved.id
      } catch (err) {
        console.warn('[ChatPage] Failed to save draft:', err)
      }

      onDashboardGenerated?.(dashboard, rows, columns, dataContext, messages, savedId)
    } catch (err) {
      console.error('[ChatPage] Generation failed:', err)
      setGenerateError((err as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }, [dataContext, selectedSource, isGenerating, spec, onDashboardGenerated, messages])

  // ── Legacy generate (fallback when no plan spec) ───────────────

  const buildSummary = useCallback((): string => {
    return messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Captain'}: ${m.content}`)
      .join('\n\n')
  }, [messages])

  const handleLegacyGenerate = useCallback(async () => {
    if (!dataContext || !selectedSource || isGenerating) return
    setIsGenerating(true)
    setGenerateError(null)

    try {
      const summary = buildSummary()
      const result = await generateDashboard(dataContext, summary)

      let rows: Record<string, unknown>[] = []
      if (selectedSource.storagePath) {
        rows = await downloadDataSourceRows(selectedSource.storagePath, selectedSource.fileName)
      }

      const columns = selectedSource.schema.columns.filter((c) => !c.hidden)

      let savedDashboardId: string | undefined
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
        savedDashboardId = saved.id
      } catch (err) {
        console.warn('[ChatPage] Failed to save draft:', err)
      }

      onDashboardGenerated?.(result.dashboard, rows, columns, dataContext, messages, savedDashboardId)
    } catch (err) {
      console.error('[ChatPage] Generation failed:', err)
      setGenerateError((err as Error).message)
    } finally {
      setIsGenerating(false)
    }
  }, [dataContext, selectedSource, isGenerating, buildSummary, onDashboardGenerated, messages])

  // ── Pin insight to plan spec ─────────────────────────────────────

  const handlePinInsight = useCallback((insight: InsightData) => {
    const id = `insight-${Date.now()}`
    if (insight.type === 'kpi') {
      applyDelta({
        action: 'add_sheet',
        sheet: {
          id,
          intent: insight.title || 'KPI',
          chartType: 'kpi',
          metrics: (insight.data as { label: string; value: string }[]).map(d => ({
            label: d.label,
            field: d.label,
            aggregation: 'sum',
          })),
        },
      })
    } else if (insight.type === 'bar') {
      const items = insight.data as InsightBarItem[]
      applyDelta({
        action: 'add_sheet',
        sheet: {
          id,
          intent: insight.title || 'Bar chart',
          chartType: 'bar',
          x: { field: 'category', type: 'dimension' },
          y: { field: items[0]?.label || 'value', type: 'measure', agg: 'sum' },
        },
      })
    } else if (insight.type === 'line') {
      applyDelta({
        action: 'add_sheet',
        sheet: {
          id,
          intent: insight.title || 'Trend line',
          chartType: 'line',
          x: { field: 'date', type: 'dimension' },
          y: { field: 'value', type: 'measure', agg: 'sum' },
        },
      })
    }
  }, [applyDelta])

  const hasMessages = messages.length > 0
  const canLegacyGenerate = hasMessages && !isStreaming && !!dataContext
  const hasPlanContent = spec.sheets.length > 0 || spec.calculatedFields.length > 0 || spec.businessRules.length > 0
  const showPlanPanel = planPanelOpen && hasPlanContent

  return (
    <div className="h-full flex">
      <div className={`flex-1 min-w-0 flex flex-col ${contextPanelOpen || showPlanPanel ? '' : 'max-w-full'}`}>
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
            {hasPlanContent && (
              <button
                onClick={() => setPlanPanelOpen(!planPanelOpen)}
                className={`font-mono text-[10px] uppercase tracking-wide px-3 py-1.5 border transition-colors ${
                  planPanelOpen
                    ? 'text-ds-accent border-ds-accent bg-ds-accent/[0.04]'
                    : 'text-ds-text-dim border-ds-border hover:border-ds-accent hover:text-ds-text'
                }`}
              >
                Plan
              </button>
            )}
            {hasMessages && (
              <button
                onClick={() => { clearMessages(); setGenerateError(null) }}
                className="font-mono text-[10px] uppercase tracking-wide text-ds-text-dim hover:text-ds-text px-3 py-1.5 transition-colors"
              >
                New Chat
              </button>
            )}
            {!contextPanelOpen && dataContext && !showPlanPanel && (
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
                    onPinInsight={isLastAssistant ? handlePinInsight : undefined}
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

        {/* Legacy generate button (when no plan spec, fallback) */}
        {canLegacyGenerate && !hasPlanContent && (
          <div className="shrink-0 px-5 pb-2">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLegacyGenerate}
                  disabled={isGenerating}
                  className="bg-ds-accent text-white font-mono text-xs font-medium px-5 py-2.5 hover:bg-ds-accent-hover transition-colors disabled:opacity-40"
                >
                  {isGenerating ? 'Generating…' : 'Generate dashboard'}
                </button>
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

      {/* Plan panel — right sidebar */}
      {showPlanPanel && (
        <div className="w-80 shrink-0">
          <PlanPanel
            spec={spec}
            fieldWarnings={planFieldWarnings}
            isValid={isValid}
            onApplyDelta={applyDelta}
            onGenerate={handlePlanGenerate}
            isGenerating={isGenerating}
          />
        </div>
      )}

      {/* Data context panel — only when plan panel is hidden */}
      {contextPanelOpen && dataContext && !showPlanPanel && (
        <div className="w-72 shrink-0">
          <DataContextPanel dataContext={dataContext} onCollapse={() => setContextPanelOpen(false)} />
        </div>
      )}
    </div>
  )
}

export default ChatPage
