import { useState, useRef, useCallback, type FC, type DragEvent, type KeyboardEvent } from 'react'
import { useProject, type Project } from '../contexts/ProjectContext'
import WorkspacePage from './WorkspacePage'

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
    name: 'Global Superstore',
    desc: '9,994 rows · 21 fields',
    fields: 'Retail · Logistics · Daily Trends',
    icon: 'storefront',
    color: 'var(--color-lp-primary)',
  },
  {
    key: 'hr',
    name: 'Team Growth Engine',
    desc: '2,400 rows · 14 fields',
    fields: 'LTV · MRR · Active Team Usage',
    icon: 'insights',
    color: 'var(--color-lp-tertiary)',
  },
  {
    key: 'ecommerce',
    name: 'E-Commerce Flow',
    desc: '5,200 rows · 12 fields',
    fields: 'Conversions · Live Inventory Feed',
    icon: 'shopping_bag',
    color: 'var(--color-lp-secondary)',
  },
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

// ── Upload Zone (glass-panel style) ─────────────────────────────

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
      className="w-full glass-panel rounded-xl p-10 flex flex-col items-center justify-center border-dashed cursor-pointer group transition-colors"
      style={{
        borderWidth: '1px',
        borderColor: isDragging ? 'var(--color-lp-primary)' : 'var(--color-lp-outline-variant)',
        background: isDragging ? 'rgba(61,130,246,0.06)' : 'rgba(255,255,255,0.4)',
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
      <span
        className="material-symbols-outlined text-5xl mb-4 transition-colors"
        style={{ color: isDragging ? 'var(--color-lp-primary)' : 'var(--color-lp-outline-variant)' }}
      >
        upload_file
      </span>
      <p className="font-semibold text-lg mb-1" style={{ fontFamily: 'var(--font-body)' }}>Hand over your data files</p>
      <p
        className="text-[10px] uppercase tracking-wider text-center"
        style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}
      >
        XLSX, CSV, or Google Sheets links &bull; Processed in seconds
      </p>
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
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-white border-none rounded-xl p-6 shadow-sm focus:ring-2 focus:ring-lp-primary h-32 resize-none transition-all"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--color-lp-on-surface)' }}
        placeholder="Tell The Captain what you need to see... 'Map our daily sales velocity against project milestones for the whole team'"
      />
      <div className="absolute bottom-4 right-4">
        <button
          onClick={handleSend}
          disabled={!value.trim()}
          className="bg-lp-primary text-white p-4 rounded-full flex items-center justify-center hover:bg-lp-primary/90 shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">send</span>
        </button>
      </div>
    </div>
  )
}

// ── Project Card ─────────────────────────────────────────────────

const ProjectCard: FC<{
  project: Project
  onClick: () => void
}> = ({ project, onClick }) => {
  return (
    <div
      className="group flex items-center gap-6 p-6 rounded-xl transition-all cursor-pointer border border-transparent hover:border-lp-outline-variant/30"
      style={{ backgroundColor: 'var(--color-lp-surface-container)' }}
      onClick={onClick}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-lp-surface-container-high)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-lp-surface-container)')}
    >
      <div className="w-14 h-14 rounded-lg bg-white flex items-center justify-center shadow-sm" style={{ color: 'var(--color-lp-primary)' }}>
        <span className="material-symbols-outlined">dashboard</span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold truncate" style={{ fontFamily: 'var(--font-body)' }}>{project.name}</h4>
        <p className="text-[11px] uppercase tracking-wider" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>
          {project.data_source_count ?? 0} source{(project.data_source_count ?? 0) !== 1 ? 's' : ''} &bull; {timeAgo(project.updated_at)}
        </p>
      </div>
      <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-lp-primary)' }}>
        play_circle
      </span>
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

  // Show workspace view when user has projects
  if (hasProjects && !loading) {
    return (
      <WorkspacePage
        projects={projects}
        onProjectSelected={onProjectSelected}
        onFileUploaded={onFileUploaded}
        onChatStarted={onChatStarted}
        onSampleSelected={onSampleSelected}
      />
    )
  }

  return (
    <div
      className="flex-1 overflow-auto"
      style={{
        fontFamily: 'var(--font-body)',
        backgroundColor: 'var(--color-lp-surface)',
        color: 'var(--color-lp-on-surface)',
      }}
    >
      <div className="max-w-7xl mx-auto px-8 pt-12 pb-24">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-8"
            style={{ backgroundColor: 'var(--color-lp-tertiary-fixed)', color: 'var(--color-lp-on-tertiary-fixed)' }}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
            <span className="text-[10px] uppercase tracking-widest font-bold" style={{ fontFamily: 'var(--font-label)' }}>AI Data Consultant in Command</span>
          </div>
          <h1
            className="text-5xl md:text-7xl mb-8 tracking-tight max-w-5xl mx-auto leading-[0.95]"
            style={{ fontFamily: 'var(--font-headline)', color: 'var(--color-lp-on-surface)' }}
          >
            Self-service analytics <span className="italic font-light">in minutes</span>.
          </h1>
          <p
            className="text-lg max-w-2xl mx-auto leading-relaxed mb-8"
            style={{ color: 'var(--color-lp-on-surface-variant)' }}
          >
            Live daily for you and your team. Turn your static spreadsheets into professional, narrative-driven analytics powered by <strong>The Captain</strong>—your personal AI consultant.
          </p>
        </section>

        {/* Main Interaction Area */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-24 items-start">
          {/* Upload & Command Console */}
          <div className="lg:col-span-7">
            <div
              className="rounded-[2rem] p-10 relative overflow-hidden ring-1 ring-lp-primary/10"
              style={{ backgroundColor: 'var(--color-lp-surface-container-low)' }}
            >
              <div className="relative z-10">
                <div className="flex items-center gap-6 mb-8">
                  <div className="w-16 h-16 rounded-full bg-white shadow-xl ring-2 ring-lp-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lp-primary text-4xl">sailing</span>
                  </div>
                  <div>
                    <h3 className="text-2xl" style={{ fontFamily: 'var(--font-headline)' }}>Command The Captain</h3>
                    <p className="text-[10px] text-lp-primary uppercase tracking-widest font-bold" style={{ fontFamily: 'var(--font-label)' }}>Standing by for your mission briefing</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <UploadZone onFile={handleFile} />
                  <HomeChatInput onSend={handleChat} />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-80 h-80 bg-lp-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            </div>
          </div>

          {/* Right Column: Projects or Samples */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-8">
              {hasProjects ? (
                <>
                  <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-headline)' }}>Your Projects</h2>
                  <p className="mb-6" style={{ color: 'var(--color-lp-on-surface-variant)' }}>
                    {projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace. Pick up where you left off.
                  </p>
                  <div className="space-y-3">
                    {projects.slice(0, 5).map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        onClick={() => onProjectSelected(project.id)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-headline)' }}>No data? Test the Bridge.</h2>
                  <p className="mb-6" style={{ color: 'var(--color-lp-on-surface-variant)' }}>
                    See how The Captain transforms complex datasets into live daily briefings for teams.
                  </p>
                </>
              )}

              {/* Sample Cards — always show */}
              {!loading && (
                <div className={`space-y-3 ${hasProjects ? 'mt-6' : ''}`}>
                  {hasProjects && (
                    <p className="text-[10px] uppercase tracking-widest font-bold mb-2" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>
                      Or try sample data
                    </p>
                  )}
                  {SAMPLES.map((sample) => (
                    <div
                      key={sample.key}
                      className="group flex items-center gap-6 p-5 rounded-xl transition-all cursor-pointer border border-transparent hover:border-lp-outline-variant/30"
                      style={{ backgroundColor: 'var(--color-lp-surface-container)' }}
                      onClick={() => onSampleSelected(sample.key, sample.name)}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-lp-surface-container-high)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-lp-surface-container)')}
                    >
                      <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center shadow-sm" style={{ color: sample.color }}>
                        <span className="material-symbols-outlined">{sample.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{sample.name}</h4>
                        <p className="text-[11px] uppercase tracking-wider" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>
                          {sample.fields}
                        </p>
                      </div>
                      <span className="material-symbols-outlined opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: sample.color }}>
                        play_circle
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Loading skeletons */}
              {loading && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="p-5 rounded-xl"
                      style={{ backgroundColor: 'var(--color-lp-surface-container)' }}
                    >
                      <div className="h-3 w-32 rounded-full mb-2" style={{ backgroundColor: 'var(--color-lp-surface-container-high)', animation: `pulse 2s ease infinite ${i * 0.1}s` }} />
                      <div className="h-2 w-48 rounded-full" style={{ backgroundColor: 'var(--color-lp-surface-container-high)', animation: `pulse 2s ease infinite ${i * 0.15}s` }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Bento Grid: Dashboard Previews & Features */}
        <section className="mb-24">
          <div className="flex justify-between items-end mb-12">
            <div className="max-w-xl">
              <h2 className="text-3xl mb-3 leading-tight" style={{ fontFamily: 'var(--font-headline)' }}>Live daily for you and your team.</h2>
              <p style={{ color: 'var(--color-lp-on-surface-variant)' }}>The Captain ensures your data is always fresh, accessible, and ready for your next big decision.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Dashboard Preview 1 */}
            <div className="md:col-span-2 rounded-[2rem] overflow-hidden border shadow-sm" style={{ backgroundColor: 'var(--color-lp-surface-container-low)', borderColor: 'rgba(194,198,214,0.1)' }}>
              <div className="p-6 border-b flex justify-between items-center bg-white/50" style={{ borderColor: 'var(--color-lp-surface-container-highest)' }}>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-lp-primary font-bold" style={{ fontFamily: 'var(--font-label)' }}>Team Performance</span>
                  <h3 className="text-xl" style={{ fontFamily: 'var(--font-headline)' }}>Daily Operational Briefing</h3>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-lp-on-surface-variant)' }}>open_in_new</span>
              </div>
              <div className="aspect-[16/10] relative overflow-hidden p-6 flex flex-col gap-4" style={{ backgroundColor: 'var(--color-lp-surface)' }}>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total Revenue', value: '$239.1K' },
                    { label: 'Profit Margin', value: '30.0%' },
                    { label: 'Avg Deal Size', value: '$39.9K' },
                    { label: 'Units Sold', value: '5.4K' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-white p-3 rounded-xl border shadow-sm" style={{ borderColor: 'rgba(194,198,214,0.2)' }}>
                      <p className="text-[9px] uppercase tracking-wider mb-1" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>{kpi.label}</p>
                      <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-headline)' }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col" style={{ borderColor: 'rgba(194,198,214,0.2)' }}>
                    <p className="text-[9px] uppercase tracking-widest font-bold mb-4" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>Revenue &amp; Profit</p>
                    <div className="flex-1 flex items-end gap-3 px-4">
                      <div className="w-1/4 h-[80%] bg-lp-primary rounded-t-sm opacity-90" />
                      <div className="w-1/4 h-[60%] bg-lp-primary/40 rounded-t-sm" />
                      <div className="w-1/4 h-[45%] bg-lp-primary rounded-t-sm opacity-90" />
                      <div className="w-1/4 h-[30%] bg-lp-primary/40 rounded-t-sm" />
                    </div>
                    <div className="flex justify-between mt-3 text-[8px] uppercase px-2" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>
                      <span>North</span><span>South</span><span>East</span><span>West</span>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col" style={{ borderColor: 'rgba(194,198,214,0.2)' }}>
                    <p className="text-[9px] uppercase tracking-widest font-bold mb-4" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>Margin Trend</p>
                    <div className="flex-1 relative flex items-center">
                      <svg className="w-full h-full" viewBox="0 0 200 100">
                        <path d="M0,80 Q25,70 50,75 T100,50 T150,60 T200,30" fill="none" stroke="#3D82F6" strokeWidth="2.5" />
                        <circle cx="200" cy="30" fill="#3D82F6" r="4" />
                      </svg>
                    </div>
                    <div className="flex justify-between mt-3 text-[8px] uppercase" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>
                      <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Card 1 */}
            <div className="rounded-[2rem] p-8 flex flex-col justify-between border-t-4 border-lp-primary shadow-sm" style={{ backgroundColor: 'var(--color-lp-surface-container-low)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-lp-primary mb-6" style={{ backgroundColor: 'var(--color-lp-primary-fixed)' }}>
                <span className="material-symbols-outlined text-3xl">sailing</span>
              </div>
              <div>
                <h3 className="text-2xl mb-3" style={{ fontFamily: 'var(--font-headline)' }}>Captain's Interpretation</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-lp-on-surface-variant)' }}>Our AI consultant automatically highlights key shifts in your daily operations, providing minutes-fast insights for the whole team.</p>
              </div>
            </div>

            {/* Feature Card 2 */}
            <div className="rounded-[2rem] p-8 flex flex-col justify-between shadow-sm" style={{ backgroundColor: 'var(--color-lp-surface-container-low)', borderTop: '4px solid var(--color-lp-secondary)' }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--color-lp-secondary-container)', color: 'var(--color-lp-secondary)' }}>
                <span className="material-symbols-outlined text-2xl">timer</span>
              </div>
              <div>
                <h3 className="text-2xl mb-3" style={{ fontFamily: 'var(--font-headline)' }}>Built in Minutes</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-lp-on-surface-variant)' }}>No more waiting for data teams. Self-service analytics means you get what you need, when you need it, with professional polish.</p>
              </div>
            </div>

            {/* Dashboard Preview 2 */}
            <div className="md:col-span-2 rounded-[2rem] overflow-hidden border shadow-sm" style={{ backgroundColor: 'var(--color-lp-surface-container-low)', borderColor: 'rgba(194,198,214,0.1)' }}>
              <div className="p-6 border-b flex justify-between items-center bg-white/50" style={{ borderColor: 'var(--color-lp-surface-container-highest)' }}>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-lp-primary font-bold" style={{ fontFamily: 'var(--font-label)' }}>Daily Sync</span>
                  <h3 className="text-xl" style={{ fontFamily: 'var(--font-headline)' }}>Team Retention &amp; LTV</h3>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-lp-on-surface-variant)' }}>open_in_new</span>
              </div>
              <div className="aspect-[16/10] bg-white relative overflow-hidden flex flex-col">
                <div className="flex h-full">
                  <div className="w-14 border-r flex flex-col items-center py-5 gap-5" style={{ borderColor: 'rgba(194,198,214,0.1)', backgroundColor: '#fafaf9' }}>
                    <span className="material-symbols-outlined text-stone-300 text-base">grid_view</span>
                    <span className="material-symbols-outlined text-lp-primary text-base">sailing</span>
                    <span className="material-symbols-outlined text-stone-300 text-base">description</span>
                    <span className="material-symbols-outlined text-stone-300 text-base">settings</span>
                  </div>
                  <div className="flex-1 flex flex-col">
                    <div className="h-10 border-b px-5 flex items-center justify-between" style={{ borderColor: 'rgba(194,198,214,0.1)' }}>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-20 bg-stone-100 rounded-full" />
                        <span className="text-[10px] text-stone-400" style={{ fontFamily: 'var(--font-label)' }}>/</span>
                        <div className="h-2 w-28 bg-stone-100 rounded-full" />
                      </div>
                      <div className="h-5 w-14 bg-lp-primary/10 rounded-lg" />
                    </div>
                    <div className="flex-1 p-6" style={{ backgroundColor: 'rgba(251,249,243,0.4)' }}>
                      <div className="max-w-2xl mx-auto space-y-5">
                        <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-stone-200 rounded-2xl bg-white/50">
                          <span className="material-symbols-outlined text-3xl text-stone-200 mb-3">analytics</span>
                          <div className="h-3 w-40 bg-stone-100 rounded-full mb-2" />
                          <div className="h-2 w-28 bg-stone-50 rounded-full" />
                        </div>
                        <div className="bg-stone-900 rounded-2xl p-5 shadow-xl relative ml-10">
                          <div className="absolute -left-3 top-5 w-5 h-5 bg-stone-900 rotate-45" />
                          <div className="flex items-start gap-3">
                            <span className="material-symbols-outlined text-lp-primary text-lg mt-1">sailing</span>
                            <div className="space-y-2 flex-1">
                              <div className="h-2 w-full bg-white/20 rounded-full" />
                              <div className="h-2 w-4/5 bg-white/20 rounded-full" />
                              <div className="h-2 w-2/3 bg-white/20 rounded-full" />
                              <div className="mt-5 flex gap-2">
                                <div className="h-7 w-20 bg-lp-primary rounded-lg" />
                                <div className="h-7 w-20 bg-white/10 rounded-lg" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="text-white rounded-[3rem] p-12 text-center relative overflow-hidden" style={{ backgroundColor: 'var(--color-lp-on-surface)' }}>
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl">
              <span className="material-symbols-outlined text-lp-primary text-4xl">sailing</span>
            </div>
            <h2 className="text-4xl md:text-5xl mb-6 leading-[0.95] max-w-3xl mx-auto" style={{ fontFamily: 'var(--font-headline)' }}>
              The bridge between <span style={{ color: 'var(--color-lp-primary-fixed-dim)' }}>raw data</span> and <span className="italic font-light">team action</span>.
            </h2>
            <p className="text-lg max-w-xl mx-auto mb-8" style={{ color: 'rgba(234,232,226,0.8)' }}>
              Set up your self-service analytics in minutes. Live daily for you and your team.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="bg-lp-primary text-white px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-lp-primary transition-colors"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              Get Started
            </button>
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-48 bg-lp-primary/20 blur-[120px] rounded-full" />
        </section>

        {/* Footer */}
        <footer className="mt-16 pt-12 border-t" style={{ borderColor: 'var(--color-lp-surface-container-highest)' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-lp-primary text-xl">sailing</span>
                <span className="text-xl font-bold text-stone-800" style={{ fontFamily: 'var(--font-headline)', fontStyle: 'italic' }}>Dashship</span>
              </div>
              <p className="text-[11px] uppercase tracking-widest leading-loose" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>
                Self-Service Analytics<br />for High-Growth Teams.
              </p>
            </div>
            <FooterColumn title="Platform" links={['Dashboard Builder', 'The Captain AI', 'Team Access']} />
            <FooterColumn title="Resources" links={['Case Studies', 'Documentation', 'Design Philosophy']} />
            <FooterColumn title="Legal" links={['Privacy Policy', 'Terms of Service']} />
          </div>
          <div className="mt-12 pt-6 border-t flex justify-between items-center" style={{ borderColor: 'var(--color-lp-surface-container-highest)' }}>
            <span className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-label)', color: 'rgba(66,71,84,0.5)' }}>&copy; 2025 Dashship Analytical Systems</span>
          </div>
        </footer>
      </div>
    </div>
  )
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="space-y-3">
      <h4 className="font-bold text-sm">{title}</h4>
      <nav className="flex flex-col gap-1.5">
        {links.map((link) => (
          <a key={link} className="text-sm hover:text-lp-primary transition-colors cursor-pointer" style={{ color: 'var(--color-lp-on-surface-variant)' }}>{link}</a>
        ))}
      </nav>
    </div>
  )
}

export default Home
