import { useState, useRef, useEffect, useMemo, useCallback, type FC } from 'react'
import FileUpload from '../components/data/FileUpload'
import DataPreview from '../components/data/DataPreview'
import SchemaViewer from '../components/data/SchemaViewer'
import MetadataGrid from '../components/data/MetadataGrid'
import CsvOptionsPanel from '../components/data/CsvOptionsPanel'
import ChangeLog from '../components/data/ChangeLog'
import DataSourceSidebar from '../components/data/DataSourceSidebar'
import AdvancedStats from '../components/data/AdvancedStats'
import RecommendationCards from '../components/data/RecommendationCards'
import { reviewDataSchema, type DataReviewResponse, type DataRecommendation } from '../lib/data-review-api'
import type { DataSourceEntry } from '../components/data/DataSourceSidebar'
import type { ChatDataContext } from '../types/chat'
import { useDataSource } from '../hooks/useDataSource'
import { uploadFileToStorage, saveDataSource } from '../lib/datasource-storage'
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
  onStartPlanning?: () => void
}

const DataPage: FC<DataPageProps> = ({ initialFile, onStartPlanning }) => {
  const ds = useDataSource()
  const { currentProject, loadProjects } = useProject()
  const [activeTab, setActiveTab] = useState<Tab>('schema')
  const [savedSources, setSavedSources] = useState<DataSourceEntry[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  // ── Data review state ─────────────────────────────────────
  const [reviewResult, setReviewResult] = useState<DataReviewResponse | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [handledRecs, setHandledRecs] = useState<Set<string>>(new Set())

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

  // Auto-save data source as soon as profiling completes.
  // This ensures data is in Supabase even if user navigates to Plan tab
  // via the nav bar instead of clicking "Start Planning".
  const autoSaveTriggeredRef = useRef(false)
  useEffect(() => {
    if (isDone && ds.file && currentProject?.id && !isSaved && !autoSaveTriggeredRef.current && saveStatus !== 'saving') {
      autoSaveTriggeredRef.current = true
      const doAutoSave = async () => {
        setSaveStatus('saving')
        try {
          const filePath = `uploads/${Date.now()}_${ds.file!.name}`
          await uploadFileToStorage(ds.file!, filePath)
          await saveDataSource({
            projectId: currentProject!.id,
            name: ds.sourceName,
            fileName: ds.file!.name,
            fileType: ds.schema!.fileType,
            fileSizeBytes: ds.schema!.fileSizeBytes,
            filePath,
            schema: ds.schema!,
            profile: ds.profile!,
          })
          setSaveStatus('saved')
          setIsSaved(true)
          await loadProjects()
          console.log('[DataPage] Auto-saved data source')
        } catch (err) {
          console.error('[DataPage] Auto-save failed:', err)
          autoSaveTriggeredRef.current = false
          setSaveStatus('idle')
        }
      }
      doAutoSave()
    }
  }, [isDone, ds.file, ds.sourceName, ds.schema, ds.profile, currentProject?.id, isSaved, saveStatus, loadProjects])

  // ── Data context for Captain ───────────────────────────────

  const dataContext: ChatDataContext | null = useMemo(() => {
    if (!isDone || !ds.schema) return null
    return {
      sourceId: 'local',
      sourceName: ds.sourceName,
      rowCount: ds.schema.rowCount,
      filePath: null,
      fileName: ds.file?.name ?? '',
      columns: ds.schema.columns
        .filter((c) => !c.hidden)
        .map((c) => {
          // Pull stats from profile if available
          const prof = ds.profile?.columns[c.name]
          let stats: Record<string, unknown> | undefined

          if (prof) {
            if (prof.type === 'numeric') {
              stats = {
                min: prof.min,
                max: prof.max,
                mean: prof.mean,
                median: prof.median,
                nullCount: prof.nullCount,
              }
            } else if (prof.type === 'categorical') {
              stats = {
                uniqueCount: prof.uniqueCount,
                nullCount: prof.nullCount,
                topValues: prof.topValues.slice(0, 15).map(tv => tv.value),
              }
            } else if (prof.type === 'date') {
              stats = {
                nullCount: prof.nullCount,
                earliest: prof.earliest,
                latest: prof.latest,
                granularity: prof.granularity,
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
    }
  }, [isDone, ds.schema, ds.sourceName])

  // ── Auto-trigger data review when data is ready ────────────

  const reviewTriggeredRef = useRef(false)
  useEffect(() => {
    if (dataContext && !reviewResult && !reviewLoading && !reviewTriggeredRef.current) {
      reviewTriggeredRef.current = true
      setReviewLoading(true)
      reviewDataSchema(dataContext)
        .then(setReviewResult)
        .catch(err => {
          console.error('Data review failed:', err)
          setReviewResult({ summary: 'Review complete.', recommendations: [] })
        })
        .finally(() => setReviewLoading(false))
    }
  }, [dataContext, reviewResult, reviewLoading])

  // ── Recommendation handlers ───────────────────────────────

  const handleApproveRec = useCallback((rec: DataRecommendation) => {
    switch (rec.type) {
      case 'rename':
        if (rec.to) ds.renameColumn(rec.field, rec.to)
        break
      case 'reclassify':
        if (rec.to_role) ds.changeColumnRole(rec.field, rec.to_role as 'dimension' | 'measure')
        break
      case 'type_change':
        if (rec.to_type) ds.changeColumnType(rec.field, rec.to_type as 'string' | 'number' | 'date' | 'boolean')
        break
      case 'hide':
        ds.toggleColumnVisibility(rec.field)
        break
    }
    setHandledRecs(prev => new Set(prev).add(rec.id))
  }, [ds])

  const handleSkipRec = useCallback((recId: string) => {
    setHandledRecs(prev => new Set(prev).add(recId))
  }, [])

  const handleApproveAll = useCallback(() => {
    if (!reviewResult) return
    for (const rec of reviewResult.recommendations) {
      if (!handledRecs.has(rec.id)) {
        handleApproveRec(rec)
      }
    }
  }, [reviewResult, handledRecs, handleApproveRec])

  const allHandled = reviewResult
    ? reviewResult.recommendations.every(r => handledRecs.has(r.id))
    : false

  // ── Save ───────────────────────────────────────────────────

  const handleSave = async () => {
    if (!ds.schema || !ds.profile || !ds.file || !currentProject?.id) return
    setSaveStatus('saving')
    setSaveError(null)

    try {
      const filePath = `uploads/${Date.now()}_${ds.file.name}`
      await uploadFileToStorage(ds.file, filePath)

      await saveDataSource({
        projectId: currentProject.id,
        name: ds.sourceName,
        fileName: ds.file.name,
        fileType: ds.schema.fileType,
        fileSizeBytes: ds.schema.fileSizeBytes,
        filePath,
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
      setIsSaved(true)
      await loadProjects()
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // ── Start Planning (auto-saves first) ──────────────────────

  const handleStartPlanning = async () => {
    if (!onStartPlanning) return
    if (!isSaved) {
      await handleSave()
    }
    onStartPlanning()
  }

  // ── Other handlers ─────────────────────────────────────────

  const handleUploadAnother = () => {
    if (isDone) handleSave()
    ds.reset()
    setIsSaved(false)
    reviewTriggeredRef.current = false
    setReviewResult(null)
    setHandledRecs(new Set())
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
              <div className="bg-ds-surface p-6" style={{ borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-ds-accent animate-pulse" style={{ borderRadius: '50%' }} />
                  <span className="font-mono text-xs uppercase tracking-widest text-ds-text-muted">
                    {ds.stage === 'parsing' ? 'Parsing file...' : 'Generating profile...'}
                  </span>
                </div>
              </div>
            )}

            {ds.stage === 'error' && ds.error && (
              <div className="bg-ds-surface p-6" style={{ borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}>
                <p className="font-mono text-xs text-ds-error">{ds.error}</p>
                <button onClick={ds.reset} className="mt-3 border border-ds-accent text-ds-text font-mono text-xs uppercase tracking-wide px-4 py-2 hover:bg-ds-accent hover:text-white transition-colors" style={{ borderRadius: 8 }}>
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
                    <button onClick={handleUploadAnother} className="border border-ds-border text-ds-text-muted font-mono text-[10px] uppercase tracking-wide px-4 py-2 hover:border-ds-accent hover:text-ds-text transition-colors" style={{ borderRadius: 8 }}>
                      Upload Another
                    </button>
                    {saveStatus === 'saving' && (
                      <span className="font-mono text-[10px] text-ds-text-dim">Saving…</span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="font-mono text-[10px] text-ds-error">{saveError || 'Save failed'}</span>
                    )}
                  </div>
                </div>

                {activeTab === 'schema' && <SchemaViewer schema={ds.schema!} profile={ds.profile!} {...tabProps} />}
                {activeTab === 'preview' && <DataPreview schema={ds.schema!} rows={ds.rows} showHidden={ds.showHidden} onRenameColumn={ds.renameColumn} onChangeType={ds.changeColumnType} onChangeRole={ds.changeColumnRole} onToggleVisibility={ds.toggleColumnVisibility} />}
                {activeTab === 'metadata' && <MetadataGrid schema={ds.schema!} profile={ds.profile!} {...tabProps} />}

                <ChangeLog entries={ds.changeLog} onRevert={ds.revertChange} />

                <AdvancedStats profile={ds.profile!} />

                {/* Next Step: Start Planning */}
                {onStartPlanning && (
                  <div className="pt-8 pb-4" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
                    <button
                      onClick={handleStartPlanning}
                      disabled={saveStatus === 'saving'}
                      className="flex items-center gap-2 bg-ds-accent text-white font-mono text-xs uppercase tracking-wide px-6 py-3 hover:bg-ds-accent-hover transition-colors disabled:opacity-40"
                      style={{ borderRadius: 10 }}
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

        {/* Captain Data Review Sidebar */}
        {isDone && (
          <div className="w-80 shrink-0 bg-ds-surface overflow-y-auto" style={{ borderLeft: '0.5px solid rgba(0,0,0,0.06)' }}>
            <div className="p-4 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-ds-accent flex items-center justify-center" style={{ borderRadius: '9999px' }}>
                  <span className="text-white text-[10px] font-mono font-medium">C</span>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-ds-text-dim">
                  Captain · Data Review
                </span>
              </div>

              {/* Loading state */}
              {reviewLoading && (
                <div className="flex items-center gap-3 py-6">
                  <div className="w-2 h-2 bg-ds-accent animate-pulse" />
                  <span className="font-mono text-xs text-ds-text-muted">
                    Captain is reviewing your data…
                  </span>
                </div>
              )}

              {/* Recommendation cards */}
              {reviewResult && !reviewLoading && (
                <RecommendationCards
                  summary={reviewResult.summary}
                  recommendations={reviewResult.recommendations}
                  onApprove={handleApproveRec}
                  onSkip={handleSkipRec}
                  onApproveAll={handleApproveAll}
                  onStartPlanning={handleStartPlanning}
                  allHandled={allHandled}
                />
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default DataPage
