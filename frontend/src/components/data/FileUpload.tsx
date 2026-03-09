import { useState, useRef, useCallback, type FC, type DragEvent } from 'react'

interface FileUploadProps {
  onFileSelected: (file: File) => void
  isLoading?: boolean
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const MAX_SIZE = 50 * 1024 * 1024 // 50MB

const FileUpload: FC<FileUploadProps> = ({ onFileSelected, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateAndSelect = useCallback(
    (file: File) => {
      setError(null)
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!ext || !['csv', 'tsv', 'xlsx', 'xls'].includes(ext)) {
        setError('Unsupported format. Use CSV, TSV, or XLSX.')
        return
      }
      if (file.size > MAX_SIZE) {
        setError(`File too large. Maximum size is ${formatBytes(MAX_SIZE)}.`)
        return
      }
      setSelectedFile(file)
      onFileSelected(file)
    },
    [onFileSelected]
  )

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) validateAndSelect(file)
    },
    [validateAndSelect]
  )

  const handleClick = () => inputRef.current?.click()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSelect(file)
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={isLoading}
        className={`w-full border border-dashed p-10 text-center transition-colors cursor-pointer ${
          isDragging
            ? 'border-gray-900 bg-gray-100'
            : 'border-gray-300 hover:border-gray-900'
        } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          onChange={handleChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border border-gray-300 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-ink">
              {isLoading ? 'Processing...' : 'Drop file here'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              CSV, TSV, or XLSX — up to 50 MB
            </p>
          </div>
        </div>
      </button>

      {error && (
        <p className="font-mono text-xs text-danger">{error}</p>
      )}

      {selectedFile && !error && (
        <div className="flex items-center justify-between border border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              {selectedFile.name.split('.').pop()}
            </span>
            <span className="text-sm text-ink truncate max-w-xs">
              {selectedFile.name}
            </span>
          </div>
          <span className="font-mono text-[10px] text-gray-400 tabular-nums">
            {formatBytes(selectedFile.size)}
          </span>
        </div>
      )}
    </div>
  )
}

export default FileUpload
