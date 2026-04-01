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
          className="text-left bg-ds-surface p-4 hover:bg-ds-accent-glow transition-all group"
          style={{ border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}
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
          className={`text-left bg-ds-surface p-4 transition-all group ${
            isDragging ? 'bg-ds-accent-glow' : 'hover:bg-ds-accent-glow'
          }`}
          style={{ border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <p className="font-sans text-[13px] font-medium text-ds-text mb-1.5">
            Connect to your data
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
