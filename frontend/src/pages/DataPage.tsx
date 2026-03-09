import { useState, type FC } from 'react'
import FileUpload from '../components/data/FileUpload'
import DataPreview from '../components/data/DataPreview'
import SchemaViewer from '../components/data/SchemaViewer'
import { useDataUpload } from '../hooks/useDataUpload'

type Tab = 'schema' | 'preview'

const DataPage: FC = () => {
  const { stage, schema, profile, rows, error, processFile, reset } =
    useDataUpload()
  const [activeTab, setActiveTab] = useState<Tab>('schema')

  const isDone = stage === 'done' && schema && profile
  const isProcessing = stage === 'parsing' || stage === 'profiling'

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="space-y-10">
        {/* Header */}
        <div className="space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Data Sources
          </p>
          <h1 className="font-mono text-3xl font-semibold text-ink leading-tight">
            {isDone ? schema.columns.length + ' columns detected.' : 'Connect your data.'}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-lg">
            {isDone
              ? `${schema.rowCount.toLocaleString()} rows across ${schema.columns.filter((c) => c.role === 'dimension').length} dimensions and ${schema.columns.filter((c) => c.role === 'measure').length} measures.`
              : 'Upload a CSV or Excel file. DashShip will auto-detect column types, compute statistics, and prepare your data for analysis.'}
          </p>
        </div>

        {/* Upload area */}
        {!isDone && (
          <FileUpload
            onFileSelected={processFile}
            isLoading={isProcessing}
          />
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-gray-900 animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest text-gray-500">
                {stage === 'parsing' ? 'Parsing file...' : 'Generating profile...'}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {stage === 'error' && error && (
          <div className="border border-gray-200 bg-white p-6">
            <p className="font-mono text-xs text-danger">{error}</p>
            <button
              onClick={reset}
              className="mt-3 border border-gray-900 text-gray-900 font-mono text-xs uppercase tracking-wide px-4 py-2 hover:bg-gray-900 hover:text-white transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Results */}
        {isDone && (
          <>
            {/* Tab switcher */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1 w-fit">
              {(['schema', 'preview'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest transition-all rounded-full ${
                    activeTab === tab
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
              <button
                onClick={reset}
                className="px-4 py-1.5 font-mono text-[11px] uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors rounded-full"
              >
                New file
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'schema' && (
              <SchemaViewer schema={schema} profile={profile} />
            )}
            {activeTab === 'preview' && (
              <DataPreview schema={schema} rows={rows} />
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DataPage
