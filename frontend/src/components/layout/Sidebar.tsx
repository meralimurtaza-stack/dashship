/**
 * Sidebar.tsx — Updated for new ProjectContext
 *
 * Changes from old version:
 * - Project type no longer has .dataSource or .dashboards
 * - Uses data_source_count / dashboard_count from new Project type
 * - onSelectProject now takes a project ID string, not a Project object
 * - Removed delete functionality (will be re-added via updateProject status='archived')
 * - Removed setCurrentProject (use selectProject instead)
 */

import { useState, useEffect, type FC } from 'react'
import { useProject } from '../../contexts/ProjectContext'
import { useAuth } from '../../contexts/AuthContext'
import { getDockByUser } from '../../lib/dock-api'
import { listDataSources } from '../../lib/datasource-storage'

interface DataSourceInfo {
  name: string
  fileType: string
  columnCount: number
  rowCount: number
}

interface SidebarProps {
  collapsed: boolean
  activeProjectId: string | null
  onSelectProject: (projectId: string) => void
  onGoHome: () => void
}

const Sidebar: FC<SidebarProps> = ({
  collapsed,
  activeProjectId,
  onSelectProject,
  onGoHome,
}) => {
  const { projects } = useProject()
  const { user } = useAuth()
  const [dockSlug, setDockSlug] = useState<string | null>(null)
  const [dataSources, setDataSources] = useState<DataSourceInfo[]>([])

  useEffect(() => {
    if (!user?.id) return
    getDockByUser(user.id).then((dock) => {
      if (dock) setDockSlug(dock.slug)
    }).catch(() => {})
  }, [user?.id])

  // Load data sources for active project
  useEffect(() => {
    if (!activeProjectId) {
      setDataSources([])
      return
    }
    listDataSources(activeProjectId).then((sources) => {
      setDataSources(sources.map(s => ({
        name: s.name,
        fileType: s.fileType,
        columnCount: s.schema?.columns?.length ?? 0,
        rowCount: s.schema?.rowCount ?? 0,
      })))
    }).catch(() => setDataSources([]))
  }, [activeProjectId])

  if (collapsed) {
    return (
      <aside className="w-0 overflow-hidden transition-all duration-200 ease-in-out shrink-0" />
    )
  }

  return (
    <aside
      className="w-[175px] h-[calc(100vh-3.5rem)] flex flex-col transition-all duration-200 ease-in-out shrink-0"
      style={{ background: 'var(--color-ds-surface)', borderRight: '0.5px solid rgba(0,0,0,0.06)' }}
    >
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

            return (
              <div
                key={project.id}
                className={`group relative w-full text-left px-3 py-2 transition-colors ${
                  isActive
                    ? 'text-ds-text'
                    : 'text-ds-text-muted hover:text-ds-text'
                }`}
                style={{
                  borderRadius: '8px',
                  background: isActive
                    ? 'var(--color-ds-accent-light)'
                    : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--color-ds-surface-alt)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = ''
                }}
              >
                <button
                  onClick={() => onSelectProject(project.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 shrink-0 text-ds-text-dim"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                      />
                    </svg>
                    <span className="font-sans text-[11px] truncate pr-5" style={{ color: 'var(--color-ds-text)' }}>
                      {project.name}
                    </span>
                  </div>
                  {isActive && (
                    <div className="ml-6 mt-1 pl-1" style={{ borderLeft: '0.5px solid var(--color-ds-border)' }}>
                      {dataSources.length > 0 ? (
                        dataSources.map((ds) => (
                          <div key={ds.name} className="py-1 px-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[9px] uppercase tracking-widest text-ds-text-dim shrink-0">
                                {ds.fileType}
                              </span>
                              <span className="font-sans text-[10px] text-ds-text truncate">
                                {ds.name}
                              </span>
                            </div>
                            <p className="font-mono text-[9px] text-ds-text-dim tabular-nums mt-0.5">
                              {ds.columnCount} cols &middot; {ds.rowCount.toLocaleString()} rows
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="font-mono text-[10px] text-ds-text-dim tabular-nums py-0.5 px-2">
                          {project.data_source_count ?? 0} source{(project.data_source_count ?? 0) !== 1 ? 's' : ''}
                          {' · '}
                          {project.dashboard_count ?? 0} dashboard{(project.dashboard_count ?? 0) !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              </div>
            )
          })
        )}
      </nav>

      {/* New Project Button */}
      <div className="px-3 py-3" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
        <button
          onClick={onGoHome}
          className="w-full flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-wide text-ds-text-muted hover:text-ds-text hover:bg-ds-surface-alt transition-colors"
          style={{ borderRadius: '10px' }}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          New Project
        </button>
      </div>

      {/* Your Dock link */}
      {dockSlug && (
        <div className="px-3 pb-1" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
          <a
            href={`/dock/${dockSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-2 px-3 py-2 mt-2 font-mono text-[10px] uppercase tracking-wide text-ds-text-muted hover:text-ds-text hover:bg-ds-surface-alt transition-colors"
            style={{ borderRadius: '10px' }}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Your Dock
          </a>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-4" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
        <p className="micro-label">Free plan</p>
        <div className="mt-2 h-1 bg-ds-surface-alt overflow-hidden" style={{ borderRadius: '4px' }}>
          <div
            className="h-full bg-ds-border-strong transition-all"
            style={{ width: `${Math.min(100, (projects.length / 3) * 100)}%`, borderRadius: '4px' }}
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
