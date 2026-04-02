import { type FC, useCallback } from 'react'
import type { Project } from '../contexts/ProjectContext'

interface WorkspacePageProps {
  projects: Project[]
  onProjectSelected: (projectId: string) => void
  onFileUploaded: (file: File) => void
  onChatStarted: (message: string) => void
  onSampleSelected: (sampleKey: string, projectName: string) => void
}

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

// Category labels based on project name keywords
function inferCategory(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('funnel') || lower.includes('sales')) return 'Sales'
  if (lower.includes('exec') || lower.includes('revenue')) return 'Executive'
  if (lower.includes('market') || lower.includes('campaign')) return 'Marketing'
  if (lower.includes('ops') || lower.includes('lead')) return 'Operations'
  if (lower.includes('health') || lower.includes('account')) return 'Health'
  if (lower.includes('retention') || lower.includes('churn')) return 'Retention'
  return 'Analytics'
}

const WorkspacePage: FC<WorkspacePageProps> = ({
  projects,
  onProjectSelected,
  onFileUploaded,
  onChatStarted,
}) => {
  const totalDashboards = projects.reduce((sum, p) => sum + (p.dashboard_count ?? 0), 0)
  const totalSources = projects.reduce((sum, p) => sum + (p.data_source_count ?? 0), 0)

  const handleNewAnalysis = useCallback(() => {
    onChatStarted('Create a new performance dashboard for my data')
  }, [onChatStarted])

  return (
    <div
      className="flex-1 overflow-auto"
      style={{
        fontFamily: 'var(--font-body)',
        backgroundColor: 'var(--color-lp-surface)',
        color: 'var(--color-lp-on-surface)',
      }}
    >
      <div className="max-w-[1440px] mx-auto px-8 md:px-12 py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-14 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className="text-[10px] uppercase tracking-[0.2em] font-semibold"
                style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-primary)' }}
              >
                Editorial Archive
              </span>
              <div className="h-[1px] w-12" style={{ backgroundColor: 'var(--color-lp-outline-variant)' }} />
            </div>
            <h1 className="text-5xl italic font-semibold tracking-tight" style={{ fontFamily: 'var(--font-headline)' }}>
              Dashboards
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={handleNewAnalysis}
              className="flex items-center gap-2 text-sm font-semibold transition-colors"
              style={{ color: 'var(--color-lp-on-surface)' }}
            >
              <span className="material-symbols-outlined text-xl" style={{ color: 'var(--color-lp-primary)' }}>add_circle</span>
              New Analysis
            </button>
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ backgroundColor: 'var(--color-lp-surface-container-low)' }}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--color-lp-primary)' }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--color-lp-primary)' }} />
              </span>
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}
              >
                Live
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard Grid — 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-20">
          {projects.map((project) => (
            <DashboardCard
              key={project.id}
              project={project}
              onClick={() => onProjectSelected(project.id)}
            />
          ))}

          {/* New Analysis Card */}
          <button
            onClick={handleNewAnalysis}
            className="group p-8 rounded-xl transition-all border border-dashed flex flex-col items-center justify-center gap-3 min-h-[260px]"
            style={{
              borderColor: 'var(--color-lp-outline-variant)',
              backgroundColor: 'var(--color-lp-surface-container-low)',
            }}
          >
            <span
              className="material-symbols-outlined text-4xl transition-transform group-hover:scale-110"
              style={{ color: 'var(--color-lp-outline-variant)' }}
            >
              add_circle
            </span>
            <div className="text-center">
              <h4 className="text-lg font-bold mb-0.5">New Dashboard</h4>
              <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>
                Upload data to begin
              </p>
            </div>
          </button>
        </div>

        {/* Priority Insights Section — Bento */}
        <section>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-3xl italic" style={{ fontFamily: 'var(--font-headline)' }}>Priority Insights</h2>
            <div className="flex-grow h-[1px]" style={{ backgroundColor: 'rgba(194,198,214,0.2)' }} />
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Captain's Recommendation Hero */}
            <div
              className="col-span-12 lg:col-span-8 relative overflow-hidden rounded-xl min-h-[360px] flex items-end p-10 group"
              style={{ backgroundColor: 'var(--color-lp-surface-container-highest)' }}
            >
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1b1c19]/60 via-[#1b1c19]/20 to-transparent" />
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20" style={{ backgroundColor: 'var(--color-lp-primary)' }} />
              <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-10" style={{ backgroundColor: 'var(--color-lp-tertiary)' }} />

              <div
                className="relative z-10 p-8 rounded-xl max-w-xl"
                style={{
                  background: 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="material-symbols-outlined"
                    style={{ color: 'var(--color-lp-tertiary)', fontVariationSettings: "'FILL' 1" }}
                  >
                    auto_awesome
                  </span>
                  <span
                    className="text-[10px] uppercase tracking-[0.2em] font-bold"
                    style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}
                  >
                    Captain&rsquo;s Recommendation
                  </span>
                </div>
                <h3 className="text-2xl italic mb-3" style={{ fontFamily: 'var(--font-headline)' }}>
                  &ldquo;You have {totalSources} data source{totalSources !== 1 ? 's' : ''} across {projects.length} project{projects.length !== 1 ? 's' : ''}. {
                    totalDashboards > 0
                      ? `Your ${totalDashboards} dashboard${totalDashboards !== 1 ? 's are' : ' is'} live and tracking.`
                      : 'Start building dashboards to unlock insights.'
                  }&rdquo;
                </h3>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--color-lp-on-surface-variant)' }}>
                  The Captain can analyze patterns across your projects and surface opportunities you might be missing.
                </p>
                <button
                  onClick={handleNewAnalysis}
                  className="text-white px-6 py-3 rounded-full text-xs font-bold tracking-wide transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(to right, var(--color-lp-primary), var(--color-lp-primary-container))' }}
                >
                  Execute Strategy Audit
                </button>
              </div>
            </div>

            {/* Secondary Stats Stack */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              {/* Health Score */}
              <div
                className="flex-1 p-8 rounded-xl border-l-4"
                style={{ backgroundColor: 'var(--color-lp-surface-container-low)', borderLeftColor: 'var(--color-lp-primary)' }}
              >
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--color-lp-primary)' }}>query_stats</span>
                  <span className="text-[10px] font-bold uppercase" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>Health Score</span>
                </div>
                <div className="mt-6">
                  <span className="text-5xl italic" style={{ fontFamily: 'var(--font-display)' }}>{projects.length > 0 ? '94%' : '--'}</span>
                  <p className="text-xs mt-2" style={{ color: 'var(--color-lp-on-surface-variant)' }}>
                    Data integrity across {totalSources} source{totalSources !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* Captain Active */}
              <div
                className="flex-1 p-8 rounded-xl relative overflow-hidden text-white"
                style={{ backgroundColor: 'var(--color-lp-tertiary-container)' }}
              >
                <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-[96px] opacity-10">psychology</span>
                <div className="relative z-10">
                  <h4 className="font-bold text-lg mb-2">Captain Active</h4>
                  <p className="text-sm opacity-80">
                    AI analysis engine is monitoring your {projects.length} project{projects.length !== 1 ? 's' : ''} for anomalies and opportunities.
                  </p>
                  <div className="mt-6 h-2 w-full bg-white/20 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Upload Banner */}
        <section className="mt-14">
          <div
            className="flex items-center justify-between p-8 rounded-xl border"
            style={{ backgroundColor: 'var(--color-lp-surface-container-low)', borderColor: 'rgba(194,198,214,0.1)' }}
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--color-lp-outline)' }}>upload_file</span>
              <div>
                <p className="text-sm font-bold">Upload new data</p>
                <p className="text-xs" style={{ color: 'var(--color-lp-on-surface-variant)' }}>CSV, XLSX &mdash; The Captain will auto-detect and analyze</p>
              </div>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv,.tsv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onFileUploaded(file)
                }}
              />
              <span
                className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold px-5 py-2.5 rounded-xl transition-colors hover:bg-white cursor-pointer"
                style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-primary)', border: '1px solid var(--color-lp-primary)' }}
              >
                Browse Files
              </span>
            </label>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-14 py-6 flex flex-wrap items-center justify-between gap-6 border-t" style={{ borderColor: 'var(--color-lp-surface-container-highest)' }}>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-outline)' }}>System Status</span>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold" style={{ fontFamily: 'var(--font-label)' }}>Stable</span>
            </div>
          </div>
          <p className="text-[9px] uppercase tracking-widest" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-outline)' }}>
            &copy; 2025 Dashship Analytics &bull; Powered by <span style={{ color: 'var(--color-lp-primary)' }} className="font-bold">The Captain</span>
          </p>
        </footer>
      </div>

      {/* Captain FAB */}
      <div className="fixed bottom-10 right-10 z-50">
        <button
          onClick={handleNewAnalysis}
          className="h-14 w-14 rounded-full text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 group relative"
          style={{ backgroundColor: 'var(--color-lp-on-surface)' }}
        >
          <span className="material-symbols-outlined text-2xl">sailing</span>
          {/* Tooltip */}
          <span
            className="absolute right-16 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
            style={{ fontFamily: 'var(--font-label)', backgroundColor: 'var(--color-lp-on-surface)' }}
          >
            Ask the Captain
          </span>
          {/* Glow ring */}
          <span className="absolute inset-0 rounded-full border-2 animate-pulse opacity-50" style={{ borderColor: 'var(--color-lp-tertiary)' }} />
        </button>
      </div>
    </div>
  )
}

// ── Dashboard Card ──────────────────────────────────────────────

function DashboardCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const hasDashboard = (project.dashboard_count ?? 0) > 0
  const category = inferCategory(project.name)
  const sourceCount = project.data_source_count ?? 0
  const dashCount = project.dashboard_count ?? 0

  // Display a relevant metric-style value
  const displayValue = hasDashboard ? `${dashCount}` : `${sourceCount}`
  const displaySuffix = hasDashboard ? (dashCount === 1 ? 'dash' : 'dashes') : (sourceCount === 1 ? 'source' : 'sources')

  return (
    <div
      className="group p-8 rounded-xl transition-all hover:-translate-y-1 cursor-pointer"
      style={{ backgroundColor: 'var(--color-lp-surface-container-low)' }}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-10">
        <div>
          <span
            className="text-[10px] uppercase tracking-widest mb-1 block"
            style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-primary)' }}
          >
            {category}
          </span>
          <h3 className="font-bold text-base leading-tight">{project.name}</h3>
        </div>
        <span className="text-[10px] whitespace-nowrap opacity-60" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>
          {timeAgo(project.updated_at)}
        </span>
      </div>

      <div className="mb-8">
        <span className="text-5xl italic" style={{ fontFamily: 'var(--font-display)' }}>{displayValue}</span>
        <div className="flex items-center gap-1 mt-2">
          {hasDashboard ? (
            <>
              <span className="material-symbols-outlined text-sm" style={{ color: 'var(--color-lp-primary)' }}>check_circle</span>
              <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-primary)' }}>
                {displaySuffix} &bull; Live
              </span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm" style={{ color: 'var(--color-lp-outline)' }}>pending</span>
              <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-label)', color: 'var(--color-lp-on-surface-variant)' }}>
                {displaySuffix} &bull; In Progress
              </span>
            </>
          )}
        </div>
      </div>

      <a
        className="flex items-center gap-2 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: 'var(--color-lp-primary)' }}
      >
        Open dashboard
        <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </a>
    </div>
  )
}

export default WorkspacePage
