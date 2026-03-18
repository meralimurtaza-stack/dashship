import { useState, useRef, useCallback, type FC, type DragEvent } from 'react'

interface DataChoiceCardsProps {
  onUseSampleData: () => void
  onUploadData: (file: File) => void
  loading?: boolean
}

const DataChoiceCards: FC<DataChoiceCardsProps> = ({ onUseSampleData, onUploadData, loading }) => {
  const [isDragging, setIsDragging] = useState(false)
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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
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
    <div className="py-2">
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

        {/* Upload card — click opens file picker, also accepts drag-and-drop */}
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`text-left border-[1.5px] bg-ds-surface p-4 transition-colors group ${
            isDragging
              ? 'border-ds-accent bg-ds-accent-glow'
              : 'border-ds-border hover:border-ds-accent hover:bg-ds-accent-glow'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="font-sans text-[13px] font-medium text-ds-text mb-1.5">
            Upload my data
          </p>
          <p className="font-sans text-[13px] text-ds-text-muted leading-relaxed">
            {isDragging
              ? 'Drop your file here'
              : 'Drop a CSV or Excel file, or click to browse.'}
          </p>
        </button>
      </div>
    </div>
  )
}

export default DataChoiceCards
