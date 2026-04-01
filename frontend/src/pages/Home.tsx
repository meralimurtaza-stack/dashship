import { useState, useRef, useCallback, type FC, type DragEvent, type KeyboardEvent } from 'react'
import { useProject, type Project } from '../contexts/ProjectContext'

// ── Types ────────────────────────────────────────────────────────

interface HomeProps {
  onFileUploaded: (file: File) => void
  onChatStarted: (message: string) => void
  onSampleSelected: (sampleKey: string, projectName: string) => void
  onProjectSelected: (projectId: string) => void
}

// ── Sample Data ──────────────────────────────────────────────────

const SAMPLES = [
  {
    key: 'sales',
    name: 'Superstore Sales',
    desc: '9,994 rows · 21 fields',
    fields: 'Orders, Profit, Shipping, Category, Region',
  },
  {
    key: 'hr',
    name: 'SaaS Metrics',
    desc: '2,400 rows · 14 fields',
    fields: 'MRR, Churn, Signups, Plan, Cohort',
  },
  {
    key: 'ecommerce',
    name: 'E-Commerce Analytics',
    desc: '5,200 rows · 12 fields',
    fields: 'Amount, Campaign, Source, Order type',
  },
]

const PROMPTS = [
  'Build a sales performance dashboard',
  'Show me customer ordering patterns',
  'Create a KPI tracker for monthly metrics',
]

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
      className="w-full text-center transition-all cursor-pointer"
      style={{
        border: isDragging ? '1.5px dashed var(--color-ds-accent)' : '1.5px dashed rgba(0,0,0,0.10)',
        borderRadius: '12px',
        padding: '24px',
        background: isDragging ? 'var(--color-ds-accent-light)' : 'var(--color-ds-surface)',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'var(--color-ds-accent)'
          e.currentTarget.style.background = 'var(--color-ds-accent-light)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragging) {
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)'
          e.currentTarget.style.background = 'var(--color-ds-surface)'
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
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
        <div
          className="flex items-center justify-center"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: isDragging ? 'white' : 'var(--color-ds-surface-alt)',
            transition: 'background 0.2s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-ds-text-dim">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="text-left">
          <span style={{ fontSize: '13.5px', color: 'var(--color-ds-text-muted)' }}>
            Connect your data — drop <strong style={{ color: 'var(--color-ds-text)', fontWeight: 500 }}>CSV</strong> or <strong style={{ color: 'var(--color-ds-text)', fontWeight: 500 }}>Excel</strong>, or click to browse
          </span>
          <div style={{ fontSize: '11px', color: 'var(--color-ds-text-dim)', marginTop: '2px' }}>
            Up to 50MB · .csv, .xlsx, .xls
          </div>
        </div>
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
    <div
      className="transition-shadow"
      style={{
        background: 'var(--color-ds-surface)',
        borderRadius: '20px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Build me a customer retention dashboard..."
        rows={2}
        className="w-full bg-transparent text-ds-text resize-none focus:outline-none placeholder:text-ds-text-dim"
        style={{
          padding: '20px 22px 14px',
          fontSize: '14.5px',
          fontFamily: 'var(--font-sans)',
          lineHeight: '1.5',
          minHeight: '72px',
          border: 'none',
        }}
      />
      <div
        className="flex items-center justify-between"
        style={{ padding: '0 18px 14px' }}
      >
        <div className="flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--color-ds-text-dim)' }}>
          <div
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'var(--color-ds-success)',
              animation: 'pulse 2s ease infinite',
            }}
          />
          <span>Captain will take the wheel</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center justify-center text-ds-text-muted hover:text-ds-text transition-colors"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              border: '0.5px solid rgba(0,0,0,0.10)',
              background: 'transparent',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            style={{
              padding: '7px 20px',
              borderRadius: '9999px',
              background: 'var(--color-ds-text)',
              color: 'var(--color-ds-bg)',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Start
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Project Card ─────────────────────────────────────────────────

const ProjectCard: FC<{
  project: Project
  onClick: () => void
}> = ({ project, onClick }) => {
  const bars = [40, 65, 30, 80, 55, 70, 45]

  return (
    <div className="relative group shrink-0 w-52">
      <button
        onClick={onClick}
        className="w-full text-left bg-ds-surface transition-all"
        style={{
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
          overflow: 'hidden',
          border: '0.5px solid transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)'
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)'
          e.currentTarget.style.borderColor = 'transparent'
        }}
      >
        <div
          className="flex items-end justify-center gap-1 px-4 pb-3"
          style={{
            height: '90px',
            background: 'var(--color-ds-surface-alt)',
          }}
        >
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 transition-colors"
              style={{
                height: `${h}%`,
                maxWidth: 14,
                background: 'var(--color-ds-text-dim)',
                opacity: 0.2,
                borderRadius: '2px 2px 0 0',
              }}
            />
          ))}
        </div>
        <div style={{ padding: '10px 14px' }}>
          <h3
            className="text-ds-text truncate"
            style={{ fontSize: '13px', fontWeight: 500, marginBottom: '3px' }}
          >
            {project.name}
          </h3>
          <div className="flex items-center gap-2" style={{ fontSize: '11px', color: 'var(--color-ds-text-dim)' }}>
            <span className="font-mono tabular-nums">
              {project.data_source_count ?? 0} source{(project.data_source_count ?? 0) !== 1 ? 's' : ''}
            </span>
            <span
              style={{
                width: '3px',
                height: '3px',
                borderRadius: '50%',
                background: 'var(--color-ds-text-dim)',
                display: 'inline-block',
              }}
            />
            <span className="font-mono tabular-nums">
              {timeAgo(project.updated_at)}
            </span>
          </div>
        </div>
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
}) => {
  const { projects, loading } = useProject()
  const hasProjects = projects.length > 0

  const handleFile = useCallback((file: File) => {
    onFileUploaded(file)
  }, [onFileUploaded])

  const handleChat = useCallback((message: string) => {
    onChatStarted(message)
  }, [onChatStarted])

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-[680px] mx-auto px-6" style={{ paddingTop: hasProjects ? '48px' : '72px', paddingBottom: '60px' }}>
        <div className="space-y-6">

          {/* Hero */}
          <div className="text-center" style={{ paddingBottom: '12px' }}>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '50px',
                fontWeight: 400,
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
                marginBottom: '12px',
              }}
            >
              Dashboards worth<br />
              <em style={{ fontStyle: 'italic', color: 'var(--color-ds-accent)' }}>publishing.</em>
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--color-ds-text-muted)', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto' }}>
              Connect your data, talk to Captain, publish under your brand.
            </p>
            {hasProjects && (
              <p style={{ fontSize: '13px', color: 'var(--color-ds-text-dim)', marginTop: '8px' }}>
                {projects.length} project{projects.length === 1 ? '' : 's'} in your workspace
              </p>
            )}
          </div>

          {/* Upload Zone */}
          <UploadZone onFile={handleFile} />

          {/* Chat Input */}
          <HomeChatInput onSend={handleChat} />

          {/* Example Prompts */}
          {!hasProjects && !loading && (
            <div className="flex flex-wrap gap-2 justify-center">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleChat(prompt)}
                  className="transition-all"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    border: '0.5px solid rgba(0,0,0,0.10)',
                    background: 'var(--color-ds-surface)',
                    fontSize: '12px',
                    color: 'var(--color-ds-text-muted)',
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-ds-accent)'
                    e.currentTarget.style.color = 'var(--color-ds-accent)'
                    e.currentTarget.style.background = 'var(--color-ds-accent-light)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)'
                    e.currentTarget.style.color = 'var(--color-ds-text-muted)'
                    e.currentTarget.style.background = 'var(--color-ds-surface)'
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Sample Data Cards */}
          {!hasProjects && !loading && (
            <div style={{ marginTop: '32px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--color-ds-text-dim)',
                  }}
                >
                  Try with sample data
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.key}
                    onClick={() => onSampleSelected(sample.key, sample.name)}
                    className="text-left transition-all"
                    style={{
                      background: 'var(--color-ds-surface)',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
                      border: '0.5px solid transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)'
                      e.currentTarget.style.borderColor = 'var(--color-ds-accent)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)'
                      e.currentTarget.style.borderColor = 'transparent'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>
                      {sample.name}
                    </div>
                    <div
                      className="font-mono"
                      style={{ fontSize: '11px', color: 'var(--color-ds-text-dim)', marginBottom: '6px' }}
                    >
                      {sample.desc}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-ds-text-muted)', lineHeight: 1.5 }}>
                      {sample.fields}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Your Projects */}
          {hasProjects && (
            <div style={{ marginTop: '16px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--color-ds-text-dim)',
                  }}
                >
                  Your projects
                </span>
                <span
                  style={{ fontSize: '12px', color: 'var(--color-ds-accent)', cursor: 'pointer', fontWeight: 500 }}
                >
                  View all →
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onClick={() => onProjectSelected(project.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Footer line */}
          {!hasProjects && !loading && (
            <p
              className="text-center"
              style={{
                fontSize: '12px',
                color: 'var(--color-ds-text-dim)',
                paddingTop: '8px',
              }}
            >
              From £29/mo · No credit card · Your data stays yours
            </p>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-ds-surface"
                  style={{ borderRadius: '12px', padding: '16px' }}
                >
                  <div
                    className="bg-ds-surface-alt animate-pulse"
                    style={{ height: '12px', width: '80px', borderRadius: '4px', marginBottom: '12px' }}
                  />
                  <div
                    className="bg-ds-surface-alt animate-pulse"
                    style={{ height: '8px', width: '128px', borderRadius: '4px', animationDelay: `${i * 0.1}s` }}
                  />
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
