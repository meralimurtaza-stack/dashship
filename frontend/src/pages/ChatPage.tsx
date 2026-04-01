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
  // This handles: leave project → return → plan sidebar restores
  useEffect(() => {
    if (currentPlan || messages.length === 0) return
    // Scan messages in reverse for the last plan_delta
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
  }, [messages.length]) // Only on mount / messages load — not every render

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
            // Pull stats from saved profile
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

  // Mid-conversation data load: when data arrives after messages already exist,
  // send an auto-message so Captain knows data is now available.
  // Checks if a "data loaded" message was already sent for this source.
  const dataAnnouncedRef = useRef(false)
  useEffect(() => {
    // Reset when data context changes source
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
      // Check if any existing message already announced this data source
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

  // ── Build conversation summary for Claude ──────────────────────

  const buildSummary = useCallback((): string => {
    return messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Captain'}: ${m.content}`)
      .join('\n\n')
  }, [messages])

  // ── Download data rows from Supabase ──────────────────────────

  const downloadRows = useCallback(async (): Promise<Record<string, unknown>[]> => {
    if (!dataContext?.filePath || !dataContext?.fileName) {
      console.warn('[ChatPage] No filePath/fileName on dataContext — charts will be empty')
      return []
    }
    try {
      const rows = await downloadDataSourceRows(dataContext.filePath, dataContext.fileName)
      console.log(`[ChatPage] Downloaded ${rows.length} rows`)

      // Coerce numeric strings to numbers — Papa Parse returns strings with dynamicTyping:false
      // Build a set of numeric column names from the schema
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

  // ── Generate dashboard (unified — both plan and legacy) ───────

  const handlePlanGenerate = useCallback(async (_approvals: ApprovalState) => {
    if (!dataContext || isGenerating) return
    setIsGenerating(true)
    setGenerateError(null)
    onGeneratingStarted?.()

    try {
      const summary = buildSummary()
      const dashboardName = currentPlan?.name || 'Dashboard'

      // Fetch actual CSV rows first so we can send sample rows to Claude
      const rows = await downloadRows()

      // Call Claude to generate JSX component — pass plan_delta + sample rows
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

      // Remap rows to use display names so they match the generated JSX field references
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

      // Fetch actual CSV rows first so we can send sample rows to Claude
      const rows = await downloadRows()

      // Call Claude to generate JSX component — pass sample rows so Claude can see real data
      const result = await generateDashboardJsx(dataContext, summary, undefined, rows)

      // Remap rows to use display names
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

  // ── Plan delta handler ─────────────────────────────────────────

  const handlePlanDelta = useCallback((delta: PlanDelta) => {
    setCurrentPlan(delta)
    onPlanChanged?.(delta)
  }, [onPlanChanged])

  const hasMessages = messages.length > 0
  const userMessageCount = messages.filter(m => m.role === 'user').length
  // Only show legacy generate after at least 2 user messages (real conversation, not first turn)
  // Only show legacy generate after real conversation (3+ user messages), not just data loading
  const canLegacyGenerate = hasMessages && userMessageCount >= 3 && !isStreaming && !!dataContext && !currentPlan
  const showPlanSidebar = !!currentPlan

  return (
    <div className="h-full flex">
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 bg-ds-surface flex items-center justify-between shrink-0" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
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
                onClick={() => { clearChat(); setGenerateError(null); setCurrentPlan(null) }}
                className="font-mono text-[10px] uppercase tracking-wide text-ds-text-dim hover:text-ds-text px-3 py-1.5 transition-colors"
              >
                New Chat
              </button>
            )}
            {currentProject?.id && (
              <button
                onClick={() => setDictionaryOpen(true)}
                className="font-mono text-[10px] uppercase tracking-wide text-ds-text-dim hover:text-ds-text px-3 py-1.5 hover:border-ds-accent transition-colors"
                style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
              >
                Dictionary
              </button>
            )}
            {!showPlanSidebar && dataContext && (
              <button
                onClick={() => setContextPanelOpen(!contextPanelOpen)}
                className="font-mono text-[10px] uppercase tracking-wide text-ds-text-dim hover:text-ds-text px-3 py-1.5 hover:border-ds-accent transition-colors"
                style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
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

              {/* Data choice cards — shown after first assistant response when no data */}
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

        {/* Legacy generate button (when Captain didn't produce a plan) */}
        {canLegacyGenerate && (
          <div className="shrink-0 px-5 pb-2">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleLegacyGenerate}
                  disabled={isGenerating}
                  className="bg-ds-accent text-white font-mono text-xs font-medium px-5 py-2.5 hover:bg-ds-accent-hover transition-colors disabled:opacity-40"
                  style={{ borderRadius: 10 }}
                >
                  {isGenerating ? 'Generating…' : 'Generate dashboard'}
                </button>
                {generateError && (
                  <span className="font-mono text-[10px] text-ds-error">{generateError}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="shrink-0 px-5 pb-4 pt-2">
          <div className="max-w-2xl mx-auto">
            <ChatInput onSend={sendMessage} disabled={isLoadingData} isStreaming={isStreaming} onStop={stopStreaming} />
          </div>
        </div>
      </div>

      {/* Plan sidebar — right side, shown when Captain has produced a plan */}
      {showPlanSidebar && (
        <div className="w-72 shrink-0">
          <PlanSidebar
            plan={currentPlan}
            dataContext={dataContext}
            onGenerate={handlePlanGenerate}
            isGenerating={isGenerating}
          />
        </div>
      )}

      {/* Data context panel — only when plan sidebar is hidden */}
      {contextPanelOpen && dataContext && !showPlanSidebar && (
        <div className="w-72 shrink-0">
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
