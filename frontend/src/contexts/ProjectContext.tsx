import { createContext, useContext, useState, useCallback, useEffect, type FC, type ReactNode } from 'react'
import { listDataSources } from '../lib/datasource-storage'
import { supabase } from '../lib/supabase'
import type { DataSource } from '../types/datasource'
import type { DashboardRecord } from '../lib/dashboard-storage'

// ── Types ────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  dataSource?: DataSource
  dashboards: DashboardRecord[]
  createdAt: string
  updatedAt: string
}

interface ProjectContextType {
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  setCurrentProject: (project: Project | null) => void
  refreshProjects: () => Promise<void>
  renameProject: (projectId: string, newName: string) => Promise<void>
}

// ── Context ──────────────────────────────────────────────────────

const ProjectContext = createContext<ProjectContextType | null>(null)

export function useProject(): ProjectContextType {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used within ProjectProvider')
  return ctx
}

// ── Provider ─────────────────────────────────────────────────────

export const ProjectProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProjects = useCallback(async () => {
    try {
      const sources = await listDataSources()

      // Fetch dashboards and group by data_source_id
      const { data: allDashboards } = await supabase
        .from('dashboards')
        .select('*')
        .order('updated_at', { ascending: false })

      const dashBySource: Record<string, DashboardRecord[]> = {}
      for (const d of allDashboards ?? []) {
        const sid = d.data_source_id
        if (sid) {
          if (!dashBySource[sid]) dashBySource[sid] = []
          dashBySource[sid].push({
            id: d.id,
            dataSourceId: d.data_source_id,
            name: d.name,
            status: d.status,
            sheets: d.sheets,
            layout: d.layout,
            data: d.data,
            publishedSlug: d.published_slug,
            chatMessages: d.chat_messages || [],
            dataContext: d.data_context || null,
            calculatedFields: d.calculated_fields || [],
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          })
        }
      }

      const mapped: Project[] = sources.map((ds) => ({
        id: ds.id,
        name: ds.name,
        dataSource: ds,
        dashboards: dashBySource[ds.id] || [],
        createdAt: ds.createdAt,
        updatedAt: ds.updatedAt,
      }))
      setProjects(mapped)
    } catch {
      // Silently fail — user may not have Supabase configured
    } finally {
      setLoading(false)
    }
  }, [])

  const renameProject = useCallback(async (projectId: string, newName: string) => {
    try {
      await supabase
        .from('data_sources')
        .update({ name: newName })
        .eq('id', projectId)
      await refreshProjects()
    } catch {
      // Non-critical
    }
  }, [refreshProjects])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProject,
        loading,
        setCurrentProject,
        refreshProjects,
        renameProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}
