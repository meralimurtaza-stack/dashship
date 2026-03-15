import { useState, useRef, useCallback, useEffect, type FC, type DragEvent, type KeyboardEvent } from 'react'
import { useProject, type Project } from '../contexts/ProjectContext'
import { deleteDataSource } from '../lib/datasource-storage'
import { listDashboards, deleteDashboard, type DashboardRecord } from '../lib/dashboard-storage'

// ── Types ────────────────────────────────────────────────────────

interface HomeProps {
  onFileUploaded: (file: File, projectName: string) => void
  onChatStarted: (message: string, projectName: string) => void
  onSampleSelected: (sampleKey: string, projectName: string) => void
  onProjectSelected: (project: Project) => void
  onDraftSelected?: (draft: DashboardRecord) => void
}

// ── Sample Data ──────────────────────────────────────────────────

const SAMPLES = [
  {
    key: 'sales',
    name: 'Sales Dashboard',
    file: '/samples/sales-data.csv',
    desc: '24 rows — revenue, regions, products',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    key: 'hr',
    name: 'HR Overview',
    file: '/samples/hr-data.csv',
    desc: '20 rows — employees, salaries, attrition',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    key: 'ecommerce',
    name: 'E-Commerce Analytics',
    file: '/samples/ecommerce-data.csv',
    desc: '20 rows — orders, products, countries',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
  },
]

const PROMPTS = [
  'Build a sales performance dashboard',
  'Show me customer ordering patterns',
  'Create a KPI tracker for monthly metrics',
]

// (Ship wheel icon removed — logo is now in Header)

// ── Relative Time ────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ── Upload Zone ──────────────────────────────────────────────────

const UploadZone: FC<{ onFile: (file: File) => void }> = ({ onFile }) => {
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
    if (file) onFile(file)
  }, [onFile])

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full border border-dashed p-6 text-center transition-colors cursor-pointer ${
        isDragging ? 'border-ds-accent bg-ds-accent-glow' : 'border-ds-border-strong hover:border-ds-accent'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.xlsx,.xls"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
        }}
        className="hidden"
      />
      <div className="flex items-center justify-center gap-3">
        <svg className="w-4 h-4 text-ds-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <span className="font-mono text-xs text-ds-text-muted">
          Drop CSV or Excel here, or click to browse
        </span>
      </div>
    </button>
  )
}

// ── Chat Input ───────────────────────────────────────────────────

const HomeChatInput: FC<{ onSend: (msg: string) => void }> = ({ onSend }) => {
  const [value, setValue] = useState('')

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSend(trimmed)
    setValue('')
  }, [value, onSend])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div className="relative border border-ds-border-strong bg-ds-surface">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Build me a customer retention dashboard..."
        rows={3}
        className="w-full px-4 py-3 pr-12 border-0 bg-transparent text-sm text-ds-text font-sans placeholder:font-mono placeholder:text-ds-text-dim resize-none focus:outline-none"
      />
      <div className="px-4 pb-3 flex items-center justify-between">
        <span className="font-sans text-[11px] text-ds-text-dim">Captain will take the wheel</span>
        <button
          onClick={handleSend}
          disabled={!value.trim()}
          className="px-4 py-1.5 bg-ds-accent text-white font-mono text-xs font-medium tracking-wider hover:bg-ds-accent-hover disabled:opacity-30 transition-colors"
          aria-label="Send message"
        >
          Start
        </button>
      </div>
    </div>
  )
}

// ── Project Card ─────────────────────────────────────────────────

const ProjectCard: FC<{ project: Project; onClick: () => void; onDelete: () => void }> = ({ project, onClick, onDelete }) => {
  const dims = project.dataSource?.schema.columns.filter((c) => c.role === 'dimension').length ?? 0
  const measures = project.dataSource?.schema.columns.filter((c) => c.role === 'measure').length ?? 0
  const bars = [40, 65, 30, 80, 55, 70, 45]

  return (
    <div className="relative group shrink-0 w-56">
      <button
        onClick={onClick}
        className="w-full text-left border border-ds-border bg-ds-surface hover:border-ds-border-strong transition-colors"
      >
        <div className="h-24 bg-ds-bg border-b border-ds-border flex items-end justify-center gap-1 px-4 pb-3">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-ds-border group-hover:bg-ds-border-strong transition-colors"
              style={{ height: `${h}%`, maxWidth: 14 }}
            />
          ))}
        </div>
        <div className="p-3 space-y-1">
          <h3 className="font-mono text-xs font-medium text-ds-text truncate">{project.name}</h3>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-ds-text-dim tabular-nums">
              {dims}D / {measures}M
            </span>
            <span className="text-[10px] text-ds-text-dim">&middot;</span>
            <span className="font-mono text-[10px] text-ds-text-dim">
              {timeAgo(project.updatedAt)}
            </span>
          </div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-ds-text-dim hover:text-ds-error transition-all"
        title="Delete data source"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ── Draft Card ──────────────────────────────────────────────────

const DraftCard: FC<{ draft: DashboardRecord; onClick: () => void; onDelete: () => void }> = ({ draft, onClick, onDelete }) => {
  const chartCount = draft.sheets.length

  return (
    <div className="relative group shrink-0 w-56">
      <button
        onClick={onClick}
        className="w-full text-left border border-ds-border bg-ds-surface hover:border-ds-border-strong transition-colors"
      >
        <div className="h-24 bg-ds-bg border-b border-ds-border flex items-center justify-center">
          <svg className="w-8 h-8 text-ds-border" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="4" />
            <rect x="14" y="10" width="7" height="7" />
            <rect x="3" y="13" width="7" height="4" />
          </svg>
        </div>
        <div className="p-3 space-y-1">
          <h3 className="font-mono text-xs font-medium text-ds-text truncate">{draft.name}</h3>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[8px] uppercase tracking-wider text-ds-success bg-[rgba(46,125,91,0.1)] px-1 py-px">
              {draft.status}
            </span>
            <span className="text-[10px] text-ds-text-dim">&middot;</span>
            <span className="font-mono text-[10px] text-ds-text-dim tabular-nums">
              {chartCount} chart{chartCount !== 1 ? 's' : ''}
            </span>
            <span className="text-[10px] text-ds-text-dim">&middot;</span>
            <span className="font-mono text-[10px] text-ds-text-dim">
              {timeAgo(draft.updatedAt)}
            </span>
          </div>
        </div>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-ds-text-dim hover:text-ds-error transition-all"
        title="Delete dashboard"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ── Main Home Page ───────────────────────────────────────────────

const Home: FC<HomeProps> = ({
  onFileUploaded,
  onChatStarted,
  onSampleSelected,
  onProjectSelected,
  onDraftSelected,
}) => {
  const { projects, loading, refreshProjects } = useProject()
  const [drafts, setDrafts] = useState<DashboardRecord[]>([])
  const hasProjects = projects.length > 0

  useEffect(() => {
    let cancelled = false
    async function loadDrafts() {
      try {
        const data = await listDashboards()
        if (!cancelled) setDrafts(data)
      } catch {
        // Silently fail
      }
    }
    loadDrafts()
    return () => { cancelled = true }
  }, [])

  const handleDeleteProject = useCallback(async (project: Project) => {
    if (!project.dataSource) return
    try {
      await deleteDataSource(project.id, project.dataSource.storagePath)
      await refreshProjects()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }, [refreshProjects])

  const handleDeleteDraft = useCallback(async (draft: DashboardRecord) => {
    try {
      await deleteDashboard(draft.id)
      setDrafts((prev) => prev.filter((d) => d.id !== draft.id))
    } catch (err) {
      console.error('Failed to delete draft:', err)
    }
  }, [])

  const handleFile = useCallback((file: File) => {
    const projectName = file.name.replace(/\.[^.]+$/, '')
    onFileUploaded(file, projectName)
  }, [onFileUploaded])

  const handleChat = useCallback((message: string) => {
    const projectName = message.slice(0, 40).replace(/[^\w\s-]/g, '').trim()
    onChatStarted(message, projectName)
  }, [onChatStarted])

  return (
    <div className="flex-1 overflow-auto">
      <div className={`max-w-2xl mx-auto px-6 ${hasProjects ? 'py-12' : 'py-20'}`}>
        <div className="space-y-8">
          {/* Greeting */}
          <div className="space-y-3">
            <h1 className="font-mono text-[30px] font-medium text-ds-text leading-tight">
              Dashboards worth publishing.
            </h1>
            <p className="font-sans text-[13px] text-ds-text-muted leading-relaxed">
              Upload data, talk to Captain, publish under your brand.
            </p>
            {hasProjects && (
              <p className="font-sans text-sm text-ds-text-dim">
                {projects.length} project{projects.length === 1 ? '' : 's'} in your workspace
              </p>
            )}
          </div>

          {/* Upload Zone */}
          <UploadZone onFile={handleFile} />

          {/* Chat Input */}
          <HomeChatInput onSend={handleChat} />

          {/* Sample prompts as pills */}
          {!hasProjects && !loading && (
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleChat(prompt)}
                  className="px-3 py-1.5 font-mono text-[11px] text-ds-text-muted border border-ds-border hover:border-ds-accent hover:text-ds-text transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Sample Data Cards — new users only */}
          {!hasProjects && !loading && (
            <div className="space-y-3">
              <p className="micro-label">Try with sample data</p>
              <div className="grid grid-cols-3 gap-3">
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.key}
                    onClick={() => onSampleSelected(sample.key, sample.name)}
                    className="text-left border border-ds-border bg-ds-surface p-4 hover:border-ds-border-strong transition-colors group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-ds-text-dim group-hover:text-ds-text-muted transition-colors">
                        {sample.icon}
                      </span>
                      <span className="micro-label">Sample CSV</span>
                    </div>
                    <h3 className="font-mono text-xs font-medium text-ds-text">
                      {sample.name}
                    </h3>
                    <p className="text-[11px] text-ds-text-dim mt-1 font-sans">
                      {sample.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Your Projects — returning users */}
          {hasProjects && (
            <div className="space-y-3">
              <p className="micro-label">Your Projects</p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => onProjectSelected(project)}
                    onDelete={() => handleDeleteProject(project)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Your Dashboards — drafts and published */}
          {drafts.length > 0 && (
            <div className="space-y-3">
              <p className="micro-label">Your Dashboards</p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                {drafts.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    onClick={() => onDraftSelected?.(draft)}
                    onDelete={() => handleDeleteDraft(draft)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Trust line */}
          {!hasProjects && !loading && (
            <p className="font-sans text-xs text-ds-text-dim text-center pt-4">
              From &pound;29/mo &middot; No credit card &middot; Your data stays yours
            </p>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-ds-border bg-ds-surface p-4">
                  <div className="h-3 w-20 bg-ds-surface-alt animate-pulse mb-3" />
                  <div className="h-2 w-32 bg-ds-surface-alt animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Home
