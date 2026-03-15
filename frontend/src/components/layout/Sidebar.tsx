import { type FC } from 'react'
import { useProject, type Project } from '../../contexts/ProjectContext'
import { deleteDataSource } from '../../lib/datasource-storage'

interface SidebarProps {
  collapsed: boolean
  activeProjectId: string | null
  onSelectProject: (project: Project) => void
  onGoHome: () => void
}

const Sidebar: FC<SidebarProps> = ({ collapsed, activeProjectId, onSelectProject, onGoHome }) => {
  const { projects, refreshProjects, currentProject, setCurrentProject } = useProject()

  const handleDelete = async (e: React.MouseEvent, project: Project) => {
    e.stopPropagation()
    if (!project.dataSource) return
    try {
      await deleteDataSource(project.id, project.dataSource.storagePath)
      if (currentProject?.id === project.id) setCurrentProject(null)
      await refreshProjects()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  if (collapsed) {
    return (
      <aside className="w-0 overflow-hidden transition-all duration-200 ease-in-out shrink-0" />
    )
  }

  return (
    <aside className="w-[175px] h-[calc(100vh-3.5rem)] border-r border-ds-border bg-ds-bg flex flex-col transition-all duration-200 ease-in-out shrink-0">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <span className="micro-label">Workspace</span>
      </div>

      {/* Project Tree */}
      <nav className="flex-1 px-2 overflow-y-auto space-y-0.5">
        {projects.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="micro-label">No projects yet</p>
          </div>
        ) : (
          projects.map((project) => {
            const isActive = project.id === activeProjectId
            const cols = project.dataSource?.schema.columns.length ?? 0
            const rows = project.dataSource?.schema.rowCount ?? 0

            return (
              <div
                key={project.id}
                className={`group relative w-full text-left px-3 py-2 transition-colors ${
                  isActive
                    ? 'bg-ds-accent-glow border-l-2 border-ds-accent text-ds-text'
                    : 'text-ds-text-muted hover:text-ds-text hover:bg-ds-surface-alt'
                }`}
              >
                <button
                  onClick={() => onSelectProject(project)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 shrink-0 text-ds-text-dim" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                    <span className="font-sans text-[11px] truncate pr-5">{project.name}</span>
                  </div>
                  {isActive && (
                    <div className="ml-6 mt-1 pl-1 border-l border-ds-border">
                      <p className="font-mono text-[10px] text-ds-text-dim tabular-nums py-0.5 px-2">
                        {rows.toLocaleString()} rows &middot; {cols} fields
                      </p>
                    </div>
                  )}
                </button>
                <button
                  onClick={(e) => handleDelete(e, project)}
                  className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 p-0.5 text-ds-text-dim hover:text-ds-error transition-all"
                  title="Delete data source"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })
        )}
      </nav>

      {/* New Project Button */}
      <div className="px-3 py-3 border-t border-ds-border">
        <button
          onClick={onGoHome}
          className="w-full flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-ds-text-muted hover:text-ds-text hover:bg-ds-surface-alt transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Project
        </button>
      </div>

      {/* Footer — plan usage */}
      <div className="px-4 py-4 border-t border-ds-border">
        <p className="micro-label">Free plan</p>
        <div className="mt-2 h-1 bg-ds-surface-alt overflow-hidden">
          <div
            className="h-full bg-ds-border-strong transition-all"
            style={{ width: `${Math.min(100, (projects.length / 3) * 100)}%` }}
          />
        </div>
        <p className="font-mono text-[10px] text-ds-text-dim mt-1 tabular-nums">
          {projects.length} / 3 projects
        </p>
      </div>
    </aside>
  )
}

export default Sidebar
