import { useState, useRef, useEffect, useMemo, useCallback, type FC } from 'react'
import FileUpload from '../components/data/FileUpload'
import DataPreview from '../components/data/DataPreview'
import SchemaViewer from '../components/data/SchemaViewer'
import MetadataGrid from '../components/data/MetadataGrid'
import CsvOptionsPanel from '../components/data/CsvOptionsPanel'
import ChangeLog from '../components/data/ChangeLog'
import DataSourceSidebar from '../components/data/DataSourceSidebar'
import CaptainSidebar from '../components/data/CaptainSidebar'
import CaptainFullPage from '../components/data/CaptainFullPage'
import AdvancedStats from '../components/data/AdvancedStats'
import type { DataSourceEntry } from '../components/data/DataSourceSidebar'
import type { ChatDataContext } from '../types/chat'
import type { GeneratedDashboard } from '../lib/generate-api'
import type { ColumnSchema } from '../types/datasource'
import type { ChatMessage } from '../types/chat'
import { useDataSource } from '../hooks/useDataSource'
import { useChatContext } from '../contexts/ChatContext'
import { uploadFileToStorage, saveDataSource } from '../lib/datasource-storage'
import { generateDashboard } from '../lib/generate-api'
import { saveDashboard } from '../lib/dashboard-storage'
import { useProject } from '../contexts/ProjectContext'

type Tab = 'schema' | 'preview' | 'metadata'

// ── Editable Source Name ────────────────────────────────────────

const EditableName: FC<{ value: string; onChange: (n: string) => void }> = ({
  value, onChange,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const commit = () => {
    const trimmed = editValue.trim()
    if (trimmed) onChange(trimmed)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setIsEditing(false)
        }}
        className="font-mono text-3xl font-medium text-ds-text bg-transparent border-b border-ds-accent outline-none leading-tight w-full"
      />
    )
  }

  return (
    <h1
      className="font-mono text-3xl font-medium text-ds-text leading-tight cursor-pointer hover:border-b hover:border-ds-text-dim transition-colors inline-block"
      onClick={() => { setEditValue(value); setIsEditing(true) }}
      title="Click to rename data source"
    >
      {value}
    </h1>
  )
}

// ── Main DataPage ───────────────────────────────────────────────

interface DataPageProps {
  initialFile?: File | null
  onDashboardGenerated?: (
    dashboard: GeneratedDashboard,
    data: Record<string, unknown>[],
    columns: ColumnSchema[],
    dataContext: ChatDataContext | null,
    chatMessages: ChatMessage[],
    dashboardId?: string
  ) => void
  onStartPlanning?: () => void
}

const DataPage: FC<DataPageProps> = ({ initialFile, onDashboardGenerated, onStartPlanning }) => {
  const ds = useDataSource()
  const { refreshProjects } = useProject()
  const [activeTab, setActiveTab] = useState<Tab>('schema')
  const [savedSources, setSavedSources] = useState<DataSourceEntry[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [captainCollapsed, setCaptainCollapsed] = useState(false)
  const [captainExpanded, setCaptainExpanded] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Auto-process initial file from Home page
  const [initialProcessed, setInitialProcessed] = useState(false)
  useEffect(() => {
    if (initialFile && !initialProcessed && ds.stage === 'idle') {
      setInitialProcessed(true)
      ds.processFile(initialFile)
    }
  }, [initialFile, initialProcessed, ds])

  const isDone = ds.stage === 'done' && ds.schema && ds.profile
  const isProcessing = ds.stage === 'parsing' || ds.stage === 'profiling'

  // ── Data context for Captain ───────────────────────────────

  const dataContext: ChatDataContext | null = useMemo(() => {
    if (!isDone || !ds.schema) return null
    return {
      sourceId: 'local',
      sourceName: ds.sourceName,
      rowCount: ds.schema.rowCount,
      columns: ds.schema.columns
        .filter((c) => !c.hidden)
        .map((c) => ({
          name: c.name,
          displayName: c.displayName || null,
          type: c.type,
          role: c.role,
          sampleValues: c.sampleValues,
        })),
    }
  }, [isDone, ds.schema, ds.sourceName])

  const { messages, isStreaming, sendMessage, stopStreaming } = useChatContext()

  // Auto-send opening message when data is ready
  const autoSentRef = useRef(false)
  useEffect(() => {
    if (dataContext && messages.length === 0 && !autoSentRef.current && !isStreaming) {
      autoSentRef.current = true
      const dims = dataContext.columns.filter((c) => c.role === 'dimension').length
      const measures = dataContext.columns.filter((c) => c.role === 'measure').length
      sendMessage(
        `I've loaded ${dataContext.sourceName} — ${dataContext.rowCount.toLocaleString()} rows with ${dims} dimensions and ${measures} measures. What patterns do you see? What dashboards should I build?`
      )
    }
  }, [dataContext, messages.length, isStreaming, sendMessage])

  // ── Save ───────────────────────────────────────────────────

  const handleSave = async () => {
    if (!ds.schema || !ds.profile || !ds.file) return
    setSaveStatus('saving')
    setSaveError(null)

    try {
      const storagePath = `uploads/${Date.now()}_${ds.file.name}`
      await uploadFileToStorage(ds.file, storagePath)

      await saveDataSource({
        name: ds.sourceName,
        fileName: ds.file.name,
        fileType: ds.schema.fileType,
        fileSizeBytes: ds.schema.fileSizeBytes,
        storagePath,
        schema: ds.schema,
        profile: ds.profile,
      })

      setSavedSources((prev) => {
        if (prev.find((s) => s.name === ds.sourceName)) return prev
        return [...prev, {
          name: ds.sourceName,
          fileType: ds.schema!.fileType,
          columnCount: ds.schema!.columns.length,
          rowCount: ds.schema!.rowCount,
        }]
      })

      setSaveStatus('saved')
      await refreshProjects()
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // ── Generate Dashboard from Captain ────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!dataContext || !ds.schema || isGenerating) return
    setIsGenerating(true)

    try {
      const summary = messages
        .map((m) => `${m.role === 'user' ? 'User' : 'Captain'}: ${m.content}`)
        .join('\n\n')

      const result = await generateDashboard(dataContext, summary)
      const rows = ds.rows
      const columns = ds.schema.columns.filter((c) => !c.hidden)

      // Save as draft
      let dashboardId: string | undefined
      try {
        const saved = await saveDashboard({
          name: result.dashboard.name,
          sheets: result.dashboard.sheets,
          layout: result.dashboard.layout,
          data: rows,
        })
        dashboardId = saved.id
      } catch (err) {
        console.warn('[DataPage] Failed to save draft:', err)
      }

      onDashboardGenerated?.(result.dashboard, rows, columns, dataContext, messages, dashboardId)
    } catch (err) {
      console.error('[DataPage] Generation failed:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [dataContext, ds.schema, ds.rows, isGenerating, messages, onDashboardGenerated])

  // ── Other handlers ─────────────────────────────────────────

  const handleUploadAnother = () => {
    if (isDone) handleSave()
    ds.reset()
    autoSentRef.current = false
  }

  const currentSource: DataSourceEntry | null = isDone
    ? { name: ds.sourceName, fileType: ds.schema!.fileType, columnCount: ds.schema!.columns.length, rowCount: ds.schema!.rowCount }
    : null

  const tabProps = {
    showHidden: ds.showHidden,
    onToggleShowHidden: ds.toggleShowHidden,
    onRenameColumn: ds.renameColumn,
    onChangeType: ds.changeColumnType,
    onChangeRole: ds.changeColumnRole,
    onToggleVisibility: ds.toggleColumnVisibility,
  }

  return (
    <div className="flex h-full">
      {(savedSources.length > 0 || isDone) && (
        <DataSourceSidebar
          sources={savedSources}
          activeName={ds.sourceName}
          currentSource={currentSource}
          onSelectSource={() => {}}
          onUploadAnother={handleUploadAnother}
        />
      )}

      <div className="flex-1 min-w-0 flex">
        <div className={`flex-1 min-w-0 px-6 py-12 overflow-y-auto ${isDone ? '' : 'max-w-4xl mx-auto'}`}>
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="micro-label">
                Data Sources
              </p>
              {isDone ? (
                <EditableName value={ds.sourceName} onChange={ds.setSourceName} />
              ) : (
                <h1 className="font-mono text-3xl font-medium text-ds-text leading-tight">
                  Connect your data.
                </h1>
              )}
              <p className="text-ds-text-muted text-sm leading-relaxed max-w-lg">
                {isDone
                  ? `${ds.schema!.rowCount.toLocaleString()} rows across ${ds.schema!.columns.filter((c) => c.role === 'dimension').length} dimensions and ${ds.schema!.columns.filter((c) => c.role === 'measure').length} measures.`
                  : 'Upload a CSV or Excel file. DashShip will auto-detect column types, compute statistics, and prepare your data for analysis.'}
              </p>
            </div>

            {!isDone && <FileUpload onFileSelected={ds.processFile} isLoading={isProcessing} />}

            {isProcessing && (
              <div className="border border-ds-border bg-ds-surface p-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-ds-accent animate-pulse" />
                  <span className="font-mono text-xs uppercase tracking-widest text-ds-text-muted">
                    {ds.stage === 'parsing' ? 'Parsing file...' : 'Generating profile...'}
                  </span>
                </div>
              </div>
            )}

            {ds.stage === 'error' && ds.error && (
              <div className="border border-ds-border bg-ds-surface p-6">
                <p className="font-mono text-xs text-ds-error">{ds.error}</p>
                <button onClick={ds.reset} className="mt-3 border border-ds-accent text-ds-text font-mono text-xs uppercase tracking-wide px-4 py-2 hover:bg-ds-accent hover:text-white transition-colors">
                  Try Again
                </button>
              </div>
            )}

            {isDone && (
              <>
                <CsvOptionsPanel
                  options={ds.csvOptions}
                  detectedDelimiter={ds.detectedDelimiter}
                  isXlsx={ds.schema!.fileType === 'xlsx'}
                  file={ds.file}
                  onChange={(opts) => ds.reparse(opts)}
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {(['schema', 'preview', 'metadata'] as Tab[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-1 pb-1.5 font-mono text-[11px] uppercase tracking-widest transition-all ${
                          activeTab === tab ? 'text-ds-text font-medium border-b-[2.5px] border-ds-accent' : 'text-ds-text-muted hover:text-ds-text'
                        }`}
                      >
                        {tab === 'metadata' ? 'Metadata' : tab}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleUploadAnother} className="border border-ds-border text-ds-text-muted font-mono text-[10px] uppercase tracking-wide px-4 py-2 hover:border-ds-accent hover:text-ds-text transition-colors">
                      Upload Another
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saveStatus === 'saving'}
                      className={`font-mono text-[10px] uppercase tracking-wide px-6 py-2 transition-colors ${
                        saveStatus === 'saved'
                          ? 'bg-ds-success text-white'
                          : saveStatus === 'error'
                          ? 'bg-ds-error text-white'
                          : saveStatus === 'saving'
                          ? 'bg-ds-text-dim text-white cursor-wait'
                          : 'bg-ds-accent text-white hover:bg-ds-accent-hover'
                      }`}
                    >
                      {saveStatus === 'saving'
                        ? 'Saving...'
                        : saveStatus === 'saved'
                        ? 'Saved'
                        : saveStatus === 'error'
                        ? saveError || 'Error'
                        : 'Save Data Source'}
                    </button>
                  </div>
                </div>

                {activeTab === 'schema' && <SchemaViewer schema={ds.schema!} profile={ds.profile!} {...tabProps} />}
                {activeTab === 'preview' && <DataPreview schema={ds.schema!} rows={ds.rows} showHidden={ds.showHidden} onRenameColumn={ds.renameColumn} onChangeType={ds.changeColumnType} onChangeRole={ds.changeColumnRole} onToggleVisibility={ds.toggleColumnVisibility} />}
                {activeTab === 'metadata' && <MetadataGrid schema={ds.schema!} profile={ds.profile!} {...tabProps} />}

                <ChangeLog entries={ds.changeLog} onRevert={ds.revertChange} />

                <AdvancedStats profile={ds.profile!} />

                {/* Next Step: Start Planning */}
                {!captainCollapsed && onStartPlanning && (
                  <div className="border-t border-ds-border pt-8 pb-4">
                    <button
                      onClick={onStartPlanning}
                      className="flex items-center gap-2 bg-ds-accent text-white font-mono text-xs uppercase tracking-wide px-6 py-3 hover:bg-ds-accent-hover transition-colors"
                    >
                      Start Planning
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Captain Sidebar (replaces AIReviewPanel) */}
        {isDone && (
          <CaptainSidebar
            messages={messages}
            isStreaming={isStreaming}
            dataContext={dataContext}
            onSend={sendMessage}
            onStop={stopStreaming}
            onExpand={() => setCaptainExpanded(true)}
            onGenerate={onDashboardGenerated ? handleGenerate : undefined}
            isGenerating={isGenerating}
            collapsed={captainCollapsed}
            onToggleCollapse={() => setCaptainCollapsed((p) => !p)}
          />
        )}
      </div>

      {/* Captain Full Page Overlay */}
      {captainExpanded && dataContext && (
        <CaptainFullPage
          messages={messages}
          isStreaming={isStreaming}
          dataContext={dataContext}
          onSend={sendMessage}
          onStop={stopStreaming}
          onMinimize={() => setCaptainExpanded(false)}
          onGenerate={onDashboardGenerated ? handleGenerate : undefined}
          isGenerating={isGenerating}
        />
      )}
    </div>
  )
}

export default DataPage
