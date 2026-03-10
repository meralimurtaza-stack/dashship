import { useState, useRef, useEffect, type FC } from 'react'
import FileUpload from '../components/data/FileUpload'
import DataPreview from '../components/data/DataPreview'
import SchemaViewer from '../components/data/SchemaViewer'
import MetadataGrid from '../components/data/MetadataGrid'
import CsvOptionsPanel from '../components/data/CsvOptionsPanel'
import ChangeLog from '../components/data/ChangeLog'
import DataSourceSidebar from '../components/data/DataSourceSidebar'
import type { DataSourceEntry } from '../components/data/DataSourceSidebar'
import { useDataSource } from '../hooks/useDataSource'

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
        className="font-mono text-3xl font-semibold text-ink bg-transparent border-b border-gray-900 outline-none leading-tight w-full"
      />
    )
  }

  return (
    <h1
      className="font-mono text-3xl font-semibold text-ink leading-tight cursor-pointer hover:border-b hover:border-gray-300 transition-colors inline-block"
      onClick={() => { setEditValue(value); setIsEditing(true) }}
      title="Click to rename data source"
    >
      {value}
    </h1>
  )
}

// ── Main DataPage ───────────────────────────────────────────────

const DataPage: FC = () => {
  const ds = useDataSource()
  const [activeTab, setActiveTab] = useState<Tab>('schema')
  const [savedSources, setSavedSources] = useState<DataSourceEntry[]>([])

  const isDone = ds.stage === 'done' && ds.schema && ds.profile
  const isProcessing = ds.stage === 'parsing' || ds.stage === 'profiling'

  const handleSave = () => {
    if (!ds.schema) return
    setSavedSources((prev) => {
      if (prev.find((s) => s.name === ds.sourceName)) return prev
      return [...prev, {
        name: ds.sourceName,
        fileType: ds.schema!.fileType,
        columnCount: ds.schema!.columns.length,
        rowCount: ds.schema!.rowCount,
      }]
    })
  }

  const handleUploadAnother = () => {
    if (isDone) handleSave()
    ds.reset()
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
    <div className="flex min-h-screen">
      {(savedSources.length > 0 || isDone) && (
        <DataSourceSidebar
          sources={savedSources}
          activeName={ds.sourceName}
          currentSource={currentSource}
          onSelectSource={() => {}}
          onUploadAnother={handleUploadAnother}
        />
      )}

      <div className="flex-1 max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Data Sources
            </p>
            {isDone ? (
              <EditableName value={ds.sourceName} onChange={ds.setSourceName} />
            ) : (
              <h1 className="font-mono text-3xl font-semibold text-ink leading-tight">
                Connect your data.
              </h1>
            )}
            <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
              {isDone
                ? `${ds.schema!.rowCount.toLocaleString()} rows across ${ds.schema!.columns.filter((c) => c.role === 'dimension').length} dimensions and ${ds.schema!.columns.filter((c) => c.role === 'measure').length} measures.`
                : 'Upload a CSV or Excel file. DashShip will auto-detect column types, compute statistics, and prepare your data for analysis.'}
            </p>
          </div>

          {!isDone && <FileUpload onFileSelected={ds.processFile} isLoading={isProcessing} />}

          {isProcessing && (
            <div className="border border-gray-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-900 animate-pulse" />
                <span className="font-mono text-xs uppercase tracking-widest text-gray-500">
                  {ds.stage === 'parsing' ? 'Parsing file...' : 'Generating profile...'}
                </span>
              </div>
            </div>
          )}

          {ds.stage === 'error' && ds.error && (
            <div className="border border-gray-200 bg-white p-6">
              <p className="font-mono text-xs text-red-500">{ds.error}</p>
              <button onClick={ds.reset} className="mt-3 border border-gray-900 text-gray-900 font-mono text-xs uppercase tracking-wide px-4 py-2 hover:bg-gray-900 hover:text-white transition-colors">
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
                onChange={(opts) => ds.reparse(opts)}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
                  {(['schema', 'preview', 'metadata'] as Tab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-all rounded-full ${
                        activeTab === tab ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {tab === 'metadata' ? 'Metadata' : tab}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={handleUploadAnother} className="border border-gray-200 text-gray-500 font-mono text-[10px] uppercase tracking-wide px-4 py-2 hover:border-gray-900 hover:text-gray-900 transition-colors">
                    Upload Another
                  </button>
                  <button onClick={handleSave} className="bg-gray-900 text-white font-mono text-[10px] uppercase tracking-wide px-6 py-2 hover:bg-gray-800 transition-colors">
                    Save Data Source
                  </button>
                </div>
              </div>

              {activeTab === 'schema' && <SchemaViewer schema={ds.schema!} profile={ds.profile!} {...tabProps} />}
              {activeTab === 'preview' && <DataPreview schema={ds.schema!} rows={ds.rows} showHidden={ds.showHidden} onRenameColumn={ds.renameColumn} onChangeType={ds.changeColumnType} onChangeRole={ds.changeColumnRole} onToggleVisibility={ds.toggleColumnVisibility} />}
              {activeTab === 'metadata' && <MetadataGrid schema={ds.schema!} profile={ds.profile!} {...tabProps} />}

              <ChangeLog entries={ds.changeLog} onRevert={ds.revertChange} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default DataPage
