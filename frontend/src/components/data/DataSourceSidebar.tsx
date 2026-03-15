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
    className={`w-full text-left px-3 py-3 border-b border-ds-border transition-colors ${
      isActive ? 'bg-ds-surface-alt border-l-2 border-l-ds-accent' : 'hover:bg-ds-surface-alt'
    }`}
  >
    <div className="flex items-center gap-2">
      <span className="font-mono text-[9px] uppercase tracking-widest text-ds-text-dim shrink-0">
        {fileType}
      </span>
      <span className="font-mono text-xs text-ds-text truncate">{name}</span>
    </div>
    <div className="flex items-center gap-3 mt-1">
      <span className="font-mono text-[10px] text-ds-text-dim tabular-nums">
        {columnCount} cols
      </span>
      <span className="font-mono text-[10px] text-ds-text-dim tabular-nums">
        {rowCount.toLocaleString()} rows
      </span>
    </div>
  </button>
)

const DataSourceSidebar: FC<DataSourceSidebarProps> = ({
  sources, activeName, currentSource, onSelectSource, onUploadAnother,
}) => (
  <div className="w-56 border-r border-ds-border bg-ds-surface shrink-0">
    <div className="px-3 py-4 border-b border-ds-border">
      <span className="micro-label">
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
      className="w-full px-3 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-ds-text-dim hover:text-ds-text-muted hover:bg-ds-surface-alt transition-colors"
    >
      + Upload another
    </button>
  </div>
)

export default DataSourceSidebar
export type { DataSourceEntry }
