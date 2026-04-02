import { useState, useEffect, useRef, useCallback, type FC } from 'react'
import ChatMessageComponent from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import ConversationStarters from '../components/chat/ConversationStarters'
import DataContextPanel from '../components/chat/DataContextPanel'
import DataChoiceCards from '../components/chat/DataChoiceCards'
import PlanSidebar from '../components/plan/PlanSidebar'
import { useChatContext } from '../contexts/ChatContext'
import { useProject } from '../contexts/ProjectContext'
import { listDataSources, downloadDataSourceRows } from '../lib/datasource-storage'
import { generateDashboardJsx } from '../lib/generate-api'
import { bulkInsertEntries } from '../lib/data-dictionary-storage'
import DataDictionaryPanel from '../components/data/DataDictionaryPanel'
import type { ChatMessage, ChatDataContext } from '../types/chat'
import { parsePlanMessage, type PlanDelta } from '../utils/plan-parser'
import type { ApprovalState } from '../components/plan/PlanSidebar'

// ── Props ────────────────────────────────────────────────────────

interface ChatPageProps {
  onDashboardGenerated?: (
    jsxCode: string,
    data: Record<string, unknown>[],
    dashboardName: string,
    dataContext: ChatDataContext | null,
    chatMessages: ChatMessage[],
    dashboardId?: string
  ) => void
  onGeneratingStarted?: () => void
  onGeneratingFailed?: () => void
  initialMessage?: string | null
  dashboardId?: string | null
  onDataUploaded?: (file: File) => void
  savedPlan?: PlanDelta | null
  onPlanChanged?: (plan: PlanDelta | null) => void
}

// ── Main Chat Page ──────────────────────────────────────────────

const ChatPage: FC<ChatPageProps> = ({ onDashboardGenerated, onGeneratingStarted, onGeneratingFailed, initialMessage, dashboardId, onDataUploaded, savedPlan, onPlanChanged }) => {
  const [contextPanelOpen, setContextPanelOpen] = useState(true)
  const [dictionaryOpen, setDictionaryOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [dataChoiceLoading, setDataChoiceLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<PlanDelta | null>(savedPlan ?? null)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get chat context
  const {
    messages, isStreaming, loading, sendMessage, stopStreaming, clearChat,
    dataContext: ctxDataContext, setDataContext, conversation,
  } = useChatContext()

  const { currentProject } = useProject()

  // Reconstruct plan from existing messages if we don't have one
  useEffect(() => {
    if (currentPlan || messages.length === 0) return
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]
      if (msg.role === 'assistant' && msg.content) {
        const { planDelta } = parsePlanMessage(msg.content)
        if (planDelta) {
          setCurrentPlan(planDelta)
          onPlanChanged?.(planDelta)
          break
        }
      }
    }
  }, [messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Data context comes from the project (set by DataPage after schema review)
  const dataContext = ctxDataContext

  // Load data context from saved data sources if not already set
  const dataContextLoadedRef = useRef(false)
  useEffect(() => {
    if (ctxDataContext || dataContextLoadedRef.current || !currentProject?.id) return
    dataContextLoadedRef.current = true
    setIsLoadingData(true)

    listDataSources(currentProject.id).then(sources => {
      if (sources.length === 0) return
      const src = sources[0]
      setDataContext({
        sourceId: src.id,
        sourceName: src.name,
        rowCount: src.schema.rowCount,
        filePath: src.filePath,
        fileName: src.fileName,
        columns: src.schema.columns
          .filter(c => !c.hidden)
          .map(c => {
            const prof = src.profile?.columns?.[c.name]
            let stats: Record<string, unknown> | undefined

            if (prof) {
              if (prof.type === 'numeric') {
                stats = {
                  min: (prof as { min: number }).min,
                  max: (prof as { max: number }).max,
                  mean: (prof as { mean: number }).mean,
                  median: (prof as { median: number }).median,
                  nullCount: prof.nullCount,
                }
              } else if (prof.type === 'categorical') {
                const catProf = prof as { uniqueCount: number; topValues: Array<{ value: string }> }
                stats = {
                  uniqueCount: catProf.uniqueCount,
                  nullCount: prof.nullCount,
                  topValues: catProf.topValues
                    .slice(0, 15).map(tv => tv.value),
                }
              } else if (prof.type === 'date') {
                const dateProf = prof as { earliest: string; latest: string; granularity: string; nullCount: number }
                stats = {
                  nullCount: dateProf.nullCount,
                  earliest: dateProf.earliest,
                  latest: dateProf.latest,
                  granularity: dateProf.granularity,
                }
              }
            }

            return {
              name: c.name,
              displayName: c.displayName || null,
              type: c.type,
              role: c.role,
              sampleValues: c.sampleValues,
              stats,
            }
          }),
      })
    }).catch(err => {
      console.error('Failed to load data sources for project:', err)
    }).finally(() => {
      setIsLoadingData(false)
    })
  }, [ctxDataContext, currentProject?.id, setDataContext])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-send initial message from Home page
  const initialSentRef = useRef(false)
  useEffect(() => {
    if (initialMessage && !initialSentRef.current && !loading && !isLoadingData && !isStreaming && messages.length === 0) {
      initialSentRef.current = true
      sendMessage(initialMessage, null, dataContext)
    }
  }, [initialMessage, loading, isLoadingData, isStreaming, messages.length, sendMessage, dataContext])

  // Auto-start conversation on PLAN tab when data is loaded and no messages exist
  const autoStartRef = useRef(false)
  useEffect(() => {
    if (
      ctxDataContext &&
      ctxDataContext.columns.length > 0 &&
      ctxDataContext.sourceName &&
      messages.length === 0 &&
      !isStreaming &&
      !isLoadingData &&
      !loading &&
      !autoStartRef.current &&
      !initialMessage
    ) {
      autoStartRef.current = true
      const dims = ctxDataContext.columns.filter(c => c.role === 'dimension').length
      const meas = ctxDataContext.columns.filter(c => c.role === 'measure').length
      sendMessage(
        `I've loaded ${ctxDataContext.sourceName} — ${ctxDataContext.rowCount.toLocaleString()} rows with ${dims} dimensions and ${meas} measures. What dashboard should I build?`,
        null,
        ctxDataContext
      )
    }
  }, [ctxDataContext, messages.length, isStreaming, isLoadingData, loading, initialMessage, sendMessage])

  // Mid-conversation data load
  const dataAnnouncedRef = useRef(false)
  useEffect(() => {
    dataAnnouncedRef.current = false
  }, [ctxDataContext?.sourceId])

  useEffect(() => {
    if (
      ctxDataContext &&
      ctxDataContext.columns.length > 0 &&
      ctxDataContext.sourceName &&
      messages.length > 0 &&
      !isStreaming &&
      !isLoadingData &&
      !loading &&
      !dataAnnouncedRef.current
    ) {
      const alreadyAnnounced = messages.some(
        m => m.role === 'user' && m.content.includes(`I've loaded ${ctxDataContext.sourceName}`)
      )
      if (alreadyAnnounced) {
        dataAnnouncedRef.current = true
        return
      }

      dataAnnouncedRef.current = true
      const dims = ctxDataContext.columns.filter(c => c.role === 'dimension').length
      const meas = ctxDataContext.columns.filter(c => c.role === 'measure').length
      sendMessage(
        `I've loaded ${ctxDataContext.sourceName} — ${ctxDataContext.rowCount.toLocaleString()} rows with ${dims} dimensions and ${meas} measures. What dashboard should I build?`,
        null,
        ctxDataContext
      )
    }
  }, [ctxDataContext, messages.length, isStreaming, isLoadingData, loading, sendMessage])

  // Reset auto-start ref when project changes
  useEffect(() => {
    autoStartRef.current = false
  }, [currentProject?.id])

  // ── Sample data / Upload from DataChoiceCards ─────────────────

  const handleUseSampleData = useCallback(async () => {
    if (!onDataUploaded) return
    setDataChoiceLoading(true)
    try {
      const resp = await fetch('/samples/sales-data.csv')
      const blob = await resp.blob()
      const file = new File([blob], 'sales-data.csv', { type: 'text/csv' })
      onDataUploaded(file)
    } catch (err) {
      console.error('Failed to load sample data:', err)
    } finally {
      setDataChoiceLoading(false)
    }
  }, [onDataUploaded])

  const handleUploadData = useCallback((file: File) => {
    if (!onDataUploaded) return
    onDataUploaded(file)
  }, [onDataUploaded])

  // ── Generate from plan ─────────────────────────────────────────

  const buildSummary = useCallback((): string => {
    return messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Captain'}: ${m.content}`)
      .join('\n\n')
  }, [messages])

  const downloadRows = useCallback(async (): Promise<Record<string, unknown>[]> => {
    if (!dataContext?.filePath || !dataContext?.fileName) {
      console.warn('[ChatPage] No filePath/fileName on dataContext — charts will be empty')
      return []
    }
    try {
      const rows = await downloadDataSourceRows(dataContext.filePath, dataContext.fileName)
      console.log(`[ChatPage] Downloaded ${rows.length} rows`)

      const numericCols = new Set(
        dataContext.columns.filter(c => c.type === 'number').map(c => c.name)
      )
      if (numericCols.size > 0 && rows.length > 0) {
        for (const row of rows) {
          for (const col of numericCols) {
            const val = row[col]
            if (typeof val === 'string' && val !== '') {
              const num = Number(val)
              if (!isNaN(num)) row[col] = num
            }
          }
        }
        console.log(`[ChatPage] Coerced ${numericCols.size} numeric columns`)
      }

      return rows
    } catch (err) {
      console.warn('[ChatPage] Failed to download data rows:', err)
      return []
    }
  }, [dataContext])

  const handlePlanGenerate = useCallback(async (_approvals: ApprovalState) => {
    if (!dataContext || isGenerating) return
    setIsGenerating(true)
    setGenerateError(null)
    onGeneratingStarted?.()

    try {
      const summary = buildSummary()
      const dashboardName = currentPlan?.name || 'Dashboard'
      const rows = await downloadRows()
      const result = await generateDashboardJsx(dataContext, summary, undefined, rows, currentPlan as Record<string, unknown> | null)

      if (result.warnings.length > 0) {
        console.warn('[ChatPage] Generation warnings:', result.warnings)
      }

      // Auto-populate data dictionary from plan
      if (currentPlan && currentProject?.id) {
        try {
          const dictEntries: Array<{ projectId: string; name: string; formula?: string; description?: string; source: 'ai' }> = []
          for (const kpi of currentPlan.kpis ?? []) {
            dictEntries.push({
              projectId: currentProject.id,
              name: kpi.name,
              formula: `${kpi.aggregation?.toUpperCase() ?? 'SUM'}(${kpi.field})`,
              description: `KPI — ${kpi.name}`,
              source: 'ai',
            })
          }
          for (const calc of currentPlan.calculatedFields ?? []) {
            dictEntries.push({
              projectId: currentProject.id,
              name: calc.name,
              formula: calc.formula,
              description: `Calculated field`,
              source: 'ai',
            })
          }
          if (dictEntries.length > 0) {
            await bulkInsertEntries(dictEntries)
            console.log(`[ChatPage] Saved ${dictEntries.length} entries to data dictionary`)
          }
        } catch (dictErr) {
          console.warn('[ChatPage] Failed to save data dictionary entries:', dictErr)
        }
      }

      const renameMap = result.renameMap ?? {}
      const remappedRows = Object.keys(renameMap).length > 0
        ? rows.map((row) => {
            const newRow: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(row)) {
              newRow[renameMap[key] ?? key] = value
            }
            return newRow
          })
        : rows

      onDashboardGenerated?.(result.jsxCode, remappedRows, dashboardName, dataContext, messages)
    } catch (err) {
      console.error('[ChatPage] Generation failed:', err)
      setGenerateError((err as Error).message)
      onGeneratingFailed?.()
    } finally {
      setIsGenerating(false)
    }
  }, [dataContext, currentPlan, isGenerating, buildSummary, downloadRows, onDashboardGenerated, onGeneratingStarted, onGeneratingFailed, messages])

  const handleLegacyGenerate = useCallback(async () => {
    if (!dataContext || isGenerating) return
    setIsGenerating(true)
    setGenerateError(null)
    onGeneratingStarted?.()

    try {
      const summary = buildSummary()
      const rows = await downloadRows()
      const result = await generateDashboardJsx(dataContext, summary, undefined, rows)

      const renameMap = result.renameMap ?? {}
      const remappedRows = Object.keys(renameMap).length > 0
        ? rows.map((row) => {
            const newRow: Record<string, unknown> = {}
            for (const [key, value] of Object.entries(row)) {
              newRow[renameMap[key] ?? key] = value
            }
            return newRow
          })
        : rows

      onDashboardGenerated?.(result.jsxCode, remappedRows, 'Dashboard', dataContext, messages)
    } catch (err) {
      console.error('[ChatPage] Generation failed:', err)
      setGenerateError((err as Error).message)
      onGeneratingFailed?.()
    } finally {
      setIsGenerating(false)
    }
  }, [dataContext, isGenerating, buildSummary, downloadRows, onDashboardGenerated, onGeneratingStarted, onGeneratingFailed, messages])

  const handlePlanDelta = useCallback((delta: PlanDelta) => {
    setCurrentPlan(delta)
    onPlanChanged?.(delta)
  }, [onPlanChanged])

  const hasMessages = messages.length > 0
  const userMessageCount = messages.filter(m => m.role === 'user').length
  const canLegacyGenerate = hasMessages && userMessageCount >= 3 && !isStreaming && !!dataContext && !currentPlan
  const showPlanSidebar = !!currentPlan

  return (
    <div
      className="h-full flex"
      style={{
        fontFamily: 'var(--font-body)',
        backgroundColor: 'var(--color-lp-surface)',
        color: 'var(--color-lp-on-surface)',
      }}
    >
      <div className="flex-1 min-w-0 flex flex-col relative">
        {/* Header bar */}
        <div
          className="px-6 py-3 flex items-center justify-between shrink-0"
          style={{
            backgroundColor: 'var(--color-lp-surface)',
            borderBottom: '1px solid var(--color-lp-surface-container-highest)',
          }}
        >
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-white shadow-sm ring-1 ring-lp-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-lp-primary text-lg">sailing</span>
            </div>
            <div>
              {dataContext ? (
                <>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-lp-on-surface)' }}>{dataContext.sourceName}</p>
                  <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>
                    {dataContext.rowCount.toLocaleString()} rows &middot; {dataContext.columns.length} fields
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-lp-on-surface)' }}>The Captain</p>
                  <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>AI Consultant Online</p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasMessages && (
              <button
                onClick={() => { clearChat(); setGenerateError(null); setCurrentPlan(null) }}
                className="text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-colors hover:bg-white"
                style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}
              >
                New Chat
              </button>
            )}
            {currentProject?.id && (
              <button
                onClick={() => setDictionaryOpen(true)}
                className="text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-colors hover:border-lp-primary"
                style={{
                  fontFamily: 'var(--font-label)',
                  color: 'var(--color-lp-on-surface-variant)',
                  border: '1px solid var(--color-lp-outline-variant)',
                }}
              >
                Dictionary
              </button>
            )}
            {!showPlanSidebar && dataContext && (
              <button
                onClick={() => setContextPanelOpen(!contextPanelOpen)}
                className="text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-colors hover:border-lp-primary"
                style={{
                  fontFamily: 'var(--font-label)',
                  color: 'var(--color-lp-on-surface-variant)',
                  border: '1px solid var(--color-lp-outline-variant)',
                }}
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
            <div className="flex-1 flex items-center justify-center px-8">
              <div className="max-w-xl text-center space-y-6">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                  style={{ backgroundColor: 'var(--color-lp-tertiary-fixed)', color: 'var(--color-lp-on-tertiary-fixed)' }}
                >
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold" style={{ fontFamily: 'var(--font-label)' }}>AI Consultant Online</span>
                </div>
                <h2 className="text-4xl md:text-5xl leading-[0.95] tracking-tight" style={{ fontFamily: 'var(--font-headline)' }}>
                  Let's build your <span className="italic font-light">vision.</span>
                </h2>
                <p className="text-lg leading-relaxed" style={{ color: 'var(--color-lp-on-surface-variant)' }}>
                  The Captain is ready to transform your raw data into professional, narrative-driven analytics.
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-8 pb-32">
            <div className="max-w-3xl mx-auto space-y-8">
              {messages.map((msg, i) => {
                const isLast = i === messages.length - 1
                const isLastAssistantMsg = msg.role === 'assistant' && !isStreaming && isLast
                return (
                  <ChatMessageComponent
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreaming && isLast}
                    onPlanDelta={msg.role === 'assistant' ? handlePlanDelta : undefined}
                    onCalcAction={isLastAssistantMsg ? sendMessage : undefined}
                    isLastAssistant={isLastAssistantMsg}
                    onChoiceSelect={isLastAssistantMsg ? sendMessage : undefined}
                  />
                )
              })}

              {/* Data choice cards */}
              {!dataContext && hasMessages && !isStreaming && onDataUploaded && (
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

        {/* Legacy generate button */}
        {canLegacyGenerate && (
          <div className="shrink-0 px-6 pb-2">
            <div className="max-w-3xl mx-auto flex items-center gap-3">
              <button
                onClick={handleLegacyGenerate}
                disabled={isGenerating}
                className="bg-lp-primary text-white text-xs font-bold uppercase tracking-widest px-6 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-40"
                style={{ fontFamily: 'var(--font-label)' }}
              >
                {isGenerating ? 'Generating...' : 'Generate Dashboard'}
              </button>
              {generateError && (
                <span className="text-xs" style={{ color: 'var(--color-lp-error)' }}>{generateError}</span>
              )}
            </div>
          </div>
        )}

        {/* Floating Input */}
        <div className="shrink-0 px-6 pb-6 pt-2">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={sendMessage} disabled={isLoadingData} isStreaming={isStreaming} onStop={stopStreaming} />
          </div>
        </div>
      </div>

      {/* Plan sidebar */}
      {showPlanSidebar && (
        <div className="w-80 shrink-0">
          <PlanSidebar
            plan={currentPlan}
            dataContext={dataContext}
            onGenerate={handlePlanGenerate}
            isGenerating={isGenerating}
          />
        </div>
      )}

      {/* Data context panel */}
      {contextPanelOpen && dataContext && !showPlanSidebar && (
        <div className="w-80 shrink-0">
          <DataContextPanel dataContext={dataContext} onCollapse={() => setContextPanelOpen(false)} />
        </div>
      )}

      {/* Data Dictionary panel */}
      {currentProject?.id && (
        <DataDictionaryPanel
          projectId={currentProject.id}
          isOpen={dictionaryOpen}
          onClose={() => setDictionaryOpen(false)}
        />
      )}
    </div>
  )
}

export default ChatPage
