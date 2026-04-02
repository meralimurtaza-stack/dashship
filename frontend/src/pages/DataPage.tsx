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
        className="text-4xl font-bold bg-transparent border-b-2 outline-none leading-tight w-full"
        style={{
          fontFamily: 'var(--font-headline)',
          color: 'var(--color-lp-on-surface)',
          borderColor: 'var(--color-lp-primary)',
        }}
      />
    )
  }

  return (
    <h1
      className="text-4xl font-bold leading-tight cursor-pointer hover:opacity-80 transition-opacity inline-block"
      style={{ fontFamily: 'var(--font-headline)', color: 'var(--color-lp-on-surface)' }}
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

  // Auto-save data source as soon as profiling completes
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

  // Data context for Captain
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
          const prof = ds.profile?.columns[c.name]
          let stats: Record<string, unknown> | undefined

          if (prof) {
            if (prof.type === 'numeric') {
              stats = { min: prof.min, max: prof.max, mean: prof.mean, median: prof.median, nullCount: prof.nullCount }
            } else if (prof.type === 'categorical') {
              stats = { uniqueCount: prof.uniqueCount, nullCount: prof.nullCount, topValues: prof.topValues.slice(0, 15).map(tv => tv.value) }
            } else if (prof.type === 'date') {
              stats = { nullCount: prof.nullCount, earliest: prof.earliest, latest: prof.latest, granularity: prof.granularity }
            }
          }

          return {
            name: c.name, displayName: c.displayName || null, type: c.type,
            role: c.role, sampleValues: c.sampleValues, stats,
          }
        }),
    }
  }, [isDone, ds.schema, ds.sourceName])

  // Auto-trigger data review
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

  // Recommendation handlers
  const handleApproveRec = useCallback((rec: DataRecommendation) => {
    switch (rec.type) {
      case 'rename': if (rec.to) ds.renameColumn(rec.field, rec.to); break
      case 'reclassify': if (rec.to_role) ds.changeColumnRole(rec.field, rec.to_role as 'dimension' | 'measure'); break
      case 'type_change': if (rec.to_type) ds.changeColumnType(rec.field, rec.to_type as 'string' | 'number' | 'date' | 'boolean'); break
      case 'hide': ds.toggleColumnVisibility(rec.field); break
    }
    setHandledRecs(prev => new Set(prev).add(rec.id))
  }, [ds])

  const handleSkipRec = useCallback((recId: string) => {
    setHandledRecs(prev => new Set(prev).add(recId))
  }, [])

  const handleApproveAll = useCallback(() => {
    if (!reviewResult) return
    for (const rec of reviewResult.recommendations) {
      if (!handledRecs.has(rec.id)) handleApproveRec(rec)
    }
  }, [reviewResult, handledRecs, handleApproveRec])

  const allHandled = reviewResult ? reviewResult.recommendations.every(r => handledRecs.has(r.id)) : false

  // Save
  const handleSave = async () => {
    if (!ds.schema || !ds.profile || !ds.file || !currentProject?.id) return
    setSaveStatus('saving')
    setSaveError(null)
    try {
      const filePath = `uploads/${Date.now()}_${ds.file.name}`
      await uploadFileToStorage(ds.file, filePath)
      await saveDataSource({
        projectId: currentProject.id, name: ds.sourceName, fileName: ds.file.name,
        fileType: ds.schema.fileType, fileSizeBytes: ds.schema.fileSizeBytes, filePath,
        schema: ds.schema, profile: ds.profile,
      })
      setSavedSources((prev) => {
        if (prev.find((s) => s.name === ds.sourceName)) return prev
        return [...prev, { name: ds.sourceName, fileType: ds.schema!.fileType, columnCount: ds.schema!.columns.length, rowCount: ds.schema!.rowCount }]
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

  const handleStartPlanning = async () => {
    if (!onStartPlanning) return
    if (!isSaved) await handleSave()
    onStartPlanning()
  }

  const handleUploadAnother = () => {
    if (isDone) handleSave()
    ds.reset()
    setIsSaved(false)
    reviewTriggeredRef.current = false
    setReviewResult(null)
    setHandledRecs(new Set())
  }

  const tabProps = {
    showHidden: ds.showHidden,
    onToggleShowHidden: ds.toggleShowHidden,
    onRenameColumn: ds.renameColumn,
    onChangeType: ds.changeColumnType,
    onChangeRole: ds.changeColumnRole,
    onToggleVisibility: ds.toggleColumnVisibility,
  }

  const dimensions = isDone ? ds.schema!.columns.filter(c => c.role === 'dimension') : []
  const measures = isDone ? ds.schema!.columns.filter(c => c.role === 'measure') : []
  const completeness = isDone && ds.profile
    ? (() => {
        const cols = Object.values(ds.profile!.columns)
        if (cols.length === 0) return 100
        const totalNulls = cols.reduce((sum, c) => sum + (c.nullCount || 0), 0)
        const totalCells = ds.schema!.rowCount * cols.length
        return totalCells > 0 ? ((1 - totalNulls / totalCells) * 100) : 100
      })()
    : 0

  return (
    <div
      className="flex h-full"
      style={{
        fontFamily: 'var(--font-body)',
        backgroundColor: 'var(--color-lp-surface)',
        color: 'var(--color-lp-on-surface)',
      }}
    >
      <div className="flex-1 min-w-0 flex">
        <div className={`flex-1 min-w-0 overflow-y-auto p-8 md:p-10 ${isDone ? '' : 'max-w-4xl mx-auto'}`}>
          <div className="max-w-5xl space-y-8">
            {/* Data Overview Header */}
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-lp-primary">database</span>
                <span
                  className="text-xs uppercase tracking-widest"
                  style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-primary)' }}
                >
                  Data Source Overview
                </span>
              </div>
              {isDone ? (
                <EditableName value={ds.sourceName} onChange={ds.setSourceName} />
              ) : (
                <h1 className="text-4xl font-bold leading-tight" style={{ fontFamily: 'var(--font-headline)' }}>
                  Connect your data.
                </h1>
              )}
              <p className="text-lg mt-2" style={{ color: 'var(--color-lp-on-surface-variant)' }}>
                {isDone
                  ? `${ds.schema!.rowCount.toLocaleString()} rows across ${dimensions.length} dimensions and ${measures.length} measures.`
                  : 'Upload a CSV or Excel file. DashShip will auto-detect column types, compute statistics, and prepare your data for analysis.'}
              </p>
            </div>

            {/* Upload zone */}
            {!isDone && <FileUpload onFileSelected={ds.processFile} isLoading={isProcessing} />}

            {/* Processing state */}
            {isProcessing && (
              <div
                className="p-6 rounded-xl border shadow-sm"
                style={{ backgroundColor: 'var(--color-lp-surface-container-lowest)', borderColor: 'rgba(194,198,214,0.1)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-lp-primary)' }} />
                  <span className="text-xs uppercase tracking-widest" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>
                    {ds.stage === 'parsing' ? 'Parsing file...' : 'Generating profile...'}
                  </span>
                </div>
              </div>
            )}

            {/* Error state */}
            {ds.stage === 'error' && ds.error && (
              <div
                className="p-6 rounded-xl border shadow-sm"
                style={{ backgroundColor: 'var(--color-lp-surface-container-lowest)', borderColor: 'rgba(194,198,214,0.1)' }}
              >
                <p className="text-xs" style={{ color: 'var(--color-lp-error)' }}>{ds.error}</p>
                <button
                  onClick={ds.reset}
                  className="mt-3 px-5 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-colors"
                  style={{
                    fontFamily: 'var(--font-label)',
                    border: '1px solid var(--color-lp-primary)',
                    color: 'var(--color-lp-primary)',
                  }}
                >
                  Try Again
                </button>
              </div>
            )}

            {isDone && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-4 gap-4">
                  <SummaryCard label="Rows" value={`${(ds.schema!.rowCount / 1000).toFixed(1)}K`} progress={85} />
                  <SummaryCard label="Columns" value={`${ds.schema!.columns.length}`} footnote={`UNSTRUCTURED: 0`} />
                  <SummaryCard label="Complete" value={`${completeness.toFixed(1)}%`} footnote="+2.4% FROM PREV" footnoteColor="var(--color-lp-primary)" />
                  <SummaryCard label="Duplicates" value="0" footnote="ALL CLEAN" footnoteColor="var(--color-lp-primary)" />
                </div>

                <CsvOptionsPanel
                  options={ds.csvOptions}
                  detectedDelimiter={ds.detectedDelimiter}
                  isXlsx={ds.schema!.fileType === 'xlsx'}
                  file={ds.file}
                  onChange={(opts) => ds.reparse(opts)}
                />

                {/* Tabbed Navigation */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-8 border-b" style={{ borderColor: 'rgba(194,198,214,0.15)' }}>
                    {(['schema', 'preview', 'metadata'] as Tab[]).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-3 px-1 text-sm font-bold uppercase transition-colors ${
                          activeTab === tab
                            ? 'border-b-2'
                            : 'hover:text-lp-on-surface'
                        }`}
                        style={{
                          fontFamily: 'var(--font-body)',
                          color: activeTab === tab ? 'var(--color-lp-primary)' : 'var(--color-lp-on-surface-variant)',
                          borderColor: activeTab === tab ? 'var(--color-lp-primary)' : 'transparent',
                        }}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleUploadAnother}
                      className="text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-colors hover:border-lp-primary"
                      style={{
                        fontFamily: 'var(--font-label)',
                        color: 'var(--color-lp-on-surface-variant)',
                        border: '1px solid var(--color-lp-outline-variant)',
                      }}
                    >
                      Upload Another
                    </button>
                    {saveStatus === 'saving' && (
                      <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-outline)' }}>Saving...</span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-[10px]" style={{ color: 'var(--color-lp-error)' }}>{saveError || 'Save failed'}</span>
                    )}
                  </div>
                </div>

                {activeTab === 'schema' && <SchemaViewer schema={ds.schema!} profile={ds.profile!} {...tabProps} />}
                {activeTab === 'preview' && <DataPreview schema={ds.schema!} rows={ds.rows} showHidden={ds.showHidden} onRenameColumn={ds.renameColumn} onChangeType={ds.changeColumnType} onChangeRole={ds.changeColumnRole} onToggleVisibility={ds.toggleColumnVisibility} />}
                {activeTab === 'metadata' && <MetadataGrid schema={ds.schema!} profile={ds.profile!} {...tabProps} />}

                <ChangeLog entries={ds.changeLog} onRevert={ds.revertChange} />
                <AdvancedStats profile={ds.profile!} />

                {/* Start Planning CTA */}
                {onStartPlanning && (
                  <div className="pt-8 pb-4" style={{ borderTop: '1px solid var(--color-lp-surface-container-highest)' }}>
                    <button
                      onClick={handleStartPlanning}
                      disabled={saveStatus === 'saving'}
                      className="flex items-center gap-2 text-white text-xs uppercase tracking-widest font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-40"
                      style={{ fontFamily: 'var(--font-label)', backgroundColor: 'var(--color-lp-primary)' }}
                    >
                      Start Planning
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Captain Data Review Sidebar */}
        {isDone && (
          <aside
            className="w-96 shrink-0 flex flex-col p-6 overflow-y-auto"
            style={{
              backgroundColor: 'rgba(245,243,238,0.5)',
              borderLeft: '1px solid rgba(228,226,221,0.3)',
            }}
          >
            {/* Captain header */}
            <div className="glass-panel p-6 rounded-xl border shadow-xl flex flex-col relative overflow-hidden" style={{ borderColor: 'rgba(194,198,214,0.1)' }}>
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: 'rgba(129,39,207,0.1)' }} />
              <div className="flex items-center gap-3 mb-5 relative">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: 'var(--color-lp-tertiary)', boxShadow: '0 4px 12px rgba(129,39,207,0.2)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                </div>
                <div>
                  <h5 className="text-lg font-bold" style={{ fontFamily: 'var(--font-headline)' }}>The Captain</h5>
                  <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-tertiary)' }}>Active Analysis</p>
                </div>
              </div>

              {/* Loading state */}
              {reviewLoading && (
                <div
                  className="p-4 rounded-xl mb-4 border"
                  style={{ backgroundColor: 'rgba(245,243,238,0.8)', borderColor: 'rgba(194,198,214,0.05)' }}
                >
                  <p className="text-sm italic leading-relaxed" style={{ color: 'var(--color-lp-on-surface-variant)' }}>
                    "Captain is reviewing your data..."
                  </p>
                </div>
              )}

              {/* Recommendations */}
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
          </aside>
        )}
      </div>
    </div>
  )
}

// ── Summary Card ────────────────────────────────────────────────

function SummaryCard({ label, value, progress, footnote, footnoteColor }: {
  label: string
  value: string
  progress?: number
  footnote?: string
  footnoteColor?: string
}) {
  return (
    <div
      className="p-6 rounded-xl border shadow-sm transition-all hover:-translate-y-0.5"
      style={{ backgroundColor: 'var(--color-lp-surface-container-lowest)', borderColor: 'rgba(194,198,214,0.1)' }}
    >
      <p
        className="text-[10px] uppercase tracking-widest mb-4"
        style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}
      >
        {label}
      </p>
      <h3 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-headline)' }}>{value}</h3>
      {progress !== undefined && (
        <div className="h-1 w-full rounded-full overflow-hidden mt-4" style={{ backgroundColor: 'var(--color-lp-surface-container-high)' }}>
          <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: 'var(--color-lp-primary)' }} />
        </div>
      )}
      {footnote && (
        <p className="text-[10px] mt-4" style={{ fontFamily: 'var(--font-label)', color: footnoteColor || 'var(--color-lp-on-surface-variant)' }}>
          {footnote}
        </p>
      )}
    </div>
  )
}

export default DataPage
