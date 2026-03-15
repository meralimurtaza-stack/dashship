import { useState, useEffect, type FC } from 'react'
import { listDataSources, deleteDataSource } from '../lib/datasource-storage'
import type { DataSource } from '../types/datasource'
import { useProject } from '../contexts/ProjectContext'

interface ProjectsPageProps {
  onNavigate?: (nav: string) => void
}

// ── Project Card ─────────────────────────────────────────────────

const ProjectCard: FC<{
  source: DataSource
  onClick: () => void
  onDelete: () => void
}> = ({ source, onClick, onDelete }) => {
  const cols = source.schema.columns.length
  const rows = source.schema.rowCount
  const dims = source.schema.columns.filter((c) => c.role === 'dimension').length
  const measures = source.schema.columns.filter((c) => c.role === 'measure').length

  // Simple chart thumbnail placeholder
  const bars = [40, 65, 30, 80, 55, 70, 45]

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="w-full text-left border border-ds-border bg-ds-surface hover:border-ds-border-strong transition-colors"

      >
        {/* Thumbnail */}
        <div className="h-32 bg-ds-bg border-b border-ds-border flex items-end justify-center gap-1.5 px-6 pb-4">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-ds-border group-hover:bg-ds-border-strong transition-colors"
              style={{ height: `${h}%`, maxWidth: 20 }}
            />
          ))}
        </div>

        {/* Info */}
        <div className="p-4 space-y-2">
          <h3 className="font-mono text-sm font-medium text-ds-text truncate">
            {source.name}
          </h3>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-ds-text-dim tabular-nums">
              {rows.toLocaleString()} rows
            </span>
            <span className="font-mono text-[10px] text-ds-text-dim tabular-nums">
              {cols} fields
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-ds-text-dim">
              {dims}D / {measures}M
            </span>
            <span className="text-[10px] text-ds-text-dim">&middot;</span>
            <span className="font-mono text-[10px] text-ds-text-dim">
              {source.schema.fileType.toUpperCase()}
            </span>
          </div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-ds-text-dim hover:text-ds-error transition-all"
        title="Delete data source"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ── Project Card Skeleton ────────────────────────────────────────

const ProjectCardSkeleton: FC = () => (
  <div className="border border-ds-border bg-ds-surface" style={{ borderRadius: 2 }}>
    <div className="h-32 bg-ds-bg border-b border-ds-border animate-pulse" />
    <div className="p-4 space-y-3">
      <div className="h-3 w-32 bg-ds-surface-alt animate-pulse" />
      <div className="h-2 w-20 bg-ds-surface-alt animate-pulse" style={{ animationDelay: '0.1s' }} />
    </div>
  </div>
)

// ── Main Page ────────────────────────────────────────────────────

const ProjectsPage: FC<ProjectsPageProps> = ({ onNavigate }) => {
  const [sources, setSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const { refreshProjects } = useProject()

  const loadSources = async () => {
    try {
      const data = await listDataSources()
      setSources(data)
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await listDataSources()
        if (!cancelled) setSources(data)
      } catch {
        // Silently fail
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleDelete = async (source: DataSource) => {
    try {
      await deleteDataSource(source.id, source.storagePath)
      await Promise.all([loadSources(), refreshProjects()])
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const hasProjects = sources.length > 0

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="space-y-10">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="font-mono text-[10px] uppercase tracking-widest text-ds-text-dim">
              Projects
            </p>
            <h1 className="font-mono text-3xl font-medium text-ds-text leading-tight">
              {hasProjects ? 'Your Projects' : 'Nothing here yet.'}
            </h1>
            <p className="text-ds-text-muted text-sm leading-relaxed max-w-md">
              {hasProjects
                ? 'Select a project to continue, or start a new one.'
                : 'Upload a dataset, describe what you need, and DashShip will generate a production-ready dashboard in seconds.'}
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('Data')}
            className="bg-ds-accent text-white font-mono text-xs uppercase tracking-wide px-6 py-3 hover:bg-ds-accent-hover transition-colors shrink-0"
    
          >
            New Project
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Project Grid */}
        {!loading && hasProjects && (
          <div className="grid grid-cols-3 gap-4">
            {sources.map((source) => (
              <ProjectCard
                key={source.id}
                source={source}
                onClick={() => onNavigate?.('Chat')}
                onDelete={() => handleDelete(source)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !hasProjects && (
          <>
            {/* CTA card */}
            <div className="border border-ds-border bg-ds-surface p-10">
              <div className="flex items-start gap-6">
                <div className="w-10 h-10 border border-ds-border-strong flex items-center justify-center shrink-0">
                  <svg
                    className="w-4 h-4 text-ds-text-dim"
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
                </div>
                <div className="flex-1 space-y-3">
                  <h2 className="font-mono text-xs uppercase tracking-widest text-ds-text">
                    Create your first project
                  </h2>
                  <p className="text-sm text-ds-text-dim leading-relaxed">
                    Start with a CSV, Excel file, or connect directly to your
                    database. Our AI will analyse your data and suggest the right
                    visualisations.
                  </p>
                  <button
                    onClick={() => onNavigate?.('Data')}
                    className="mt-2 bg-ds-accent text-white font-mono text-xs uppercase tracking-wide px-6 py-3 hover:bg-ds-accent-hover transition-colors"
            
                  >
                    New Project
                  </button>
                </div>
              </div>
            </div>

            {/* Feature hints */}
            <div className="grid grid-cols-3 gap-px bg-ds-border">
              {[
                { label: 'Upload', desc: 'CSV, XLSX, or database' },
                { label: 'Chat', desc: 'Describe your analysis' },
                { label: 'Ship', desc: 'Publish to a hosted URL' },
              ].map((step) => (
                <div key={step.label} className="bg-ds-bg p-6">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ds-text-dim">
                    {step.label}
                  </p>
                  <p className="text-sm text-ds-text-muted mt-2">{step.desc}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ProjectsPage
