import type { FC } from 'react'

interface DataSourceEntry {
  name: string
  fileType: string
  columnCount: number
  rowCount: number
}

interface DataSourceSidebarProps {
  sources: DataSourceEntry[]
  activeName: string
  currentSource?: DataSourceEntry | null
  onSelectSource: (name: string) => void
  onUploadAnother: () => void
}

const SidebarItem: FC<{
  name: string
  isActive: boolean
  fileType: string
  columnCount: number
  rowCount: number
  onClick: () => void
}> = ({ name, isActive, fileType, columnCount, rowCount, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full text-left px-3 py-3 border-b border-gray-100 transition-colors ${
      isActive ? 'bg-gray-50 border-l-2 border-l-gray-900' : 'hover:bg-gray-50'
    }`}
  >
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-widest text-gray-400 shrink-0">
        {fileType}
      </span>
      <span className="font-mono text-xs text-ink truncate">{name}</span>
    </div>
    <div className="flex items-center gap-3 mt-1">
      <span className="font-mono text-[10px] text-gray-400 tabular-nums">
        {columnCount} cols
      </span>
      <span className="font-mono text-[10px] text-gray-400 tabular-nums">
        {rowCount.toLocaleString()} rows
      </span>
    </div>
  </button>
)

const DataSourceSidebar: FC<DataSourceSidebarProps> = ({
  sources, activeName, currentSource, onSelectSource, onUploadAnother,
}) => (
  <div className="w-56 border-r border-gray-200 bg-white shrink-0">
    <div className="px-3 py-4 border-b border-gray-200">
      <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
        Data Sources
      </span>
    </div>

    {sources.map((src) => (
      <SidebarItem
        key={src.name}
        name={src.name}
        isActive={src.name === activeName}
        fileType={src.fileType}
        columnCount={src.columnCount}
        rowCount={src.rowCount}
        onClick={() => onSelectSource(src.name)}
      />
    ))}

    {currentSource && !sources.find((s) => s.name === currentSource.name) && (
      <SidebarItem
        name={currentSource.name}
        isActive={true}
        fileType={currentSource.fileType}
        columnCount={currentSource.columnCount}
        rowCount={currentSource.rowCount}
        onClick={() => {}}
      />
    )}

    <button
      type="button"
      onClick={onUploadAnother}
      className="w-full px-3 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
    >
      + Upload another
    </button>
  </div>
)

export default DataSourceSidebar
export type { DataSourceEntry }
