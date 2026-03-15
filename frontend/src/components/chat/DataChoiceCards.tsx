import { useState, useRef, useCallback, type FC, type DragEvent } from 'react'

interface DataChoiceCardsProps {
  onUseSampleData: () => void
  onUploadData: (file: File) => void
  loading?: boolean
}

const DataChoiceCards: FC<DataChoiceCardsProps> = ({ onUseSampleData, onUploadData, loading }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [showDropzone, setShowDropzone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onUploadData(file)
  }, [onUploadData])

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-4">
        <div className="w-4 h-4 border-2 border-ds-accent border-t-transparent animate-spin" style={{ borderRadius: '50%' }} />
        <span className="font-sans text-sm text-ds-text-muted">Loading data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-3 py-2">
      <div className="grid grid-cols-2 gap-3">
        {/* Sample data card */}
        <button
          onClick={onUseSampleData}
          className="text-left border-[1.5px] border-ds-border bg-ds-surface p-4 hover:border-ds-accent hover:bg-ds-accent-glow transition-colors group"
        >
          <p className="font-sans text-[13px] font-medium text-ds-text mb-1.5">
            Use sample data
          </p>
          <p className="font-sans text-[13px] text-ds-text-muted leading-relaxed">
            See a dashboard in 60 seconds. Swap in your real data later.
          </p>
        </button>

        {/* Upload card */}
        <button
          onClick={() => setShowDropzone(true)}
          className="text-left border-[1.5px] border-ds-border bg-ds-surface p-4 hover:border-ds-accent hover:bg-ds-accent-glow transition-colors group"
        >
          <p className="font-sans text-[13px] font-medium text-ds-text mb-1.5">
            Upload my data
          </p>
          <p className="font-sans text-[13px] text-ds-text-muted leading-relaxed">
            Drop a CSV or Excel file and I'll tailor the dashboard to your actual fields.
          </p>
        </button>
      </div>

      {/* Inline dropzone */}
      {showDropzone && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border border-dashed p-6 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-ds-accent bg-ds-accent-glow' : 'border-ds-border-strong hover:border-ds-accent'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onUploadData(file)
            }}
            className="hidden"
          />
          <div className="flex items-center justify-center gap-3">
            <svg className="w-4 h-4 text-ds-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="font-mono text-xs text-ds-text-muted">
              Drop CSV or Excel here, or click to browse
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataChoiceCards
