import { createContext, useContext, useState, useCallback, useEffect, type FC, type ReactNode } from 'react'
import { listDataSources } from '../lib/datasource-storage'
import type { DataSource } from '../types/datasource'

// ── Types ────────────────────────────────────────────────────────

export interface Project {
  id: string
  name: string
  dataSource?: DataSource
  createdAt: string
  updatedAt: string
}

interface ProjectContextType {
  projects: Project[]
  currentProject: Project | null
  loading: boolean
  setCurrentProject: (project: Project | null) => void
  refreshProjects: () => Promise<void>
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
      const mapped: Project[] = sources.map((ds) => ({
        id: ds.id,
        name: ds.name,
        dataSource: ds,
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
      }}
    >
      {children}
    </ProjectContext.Provider>
  )
}
