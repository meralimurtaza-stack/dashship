import { useState, useEffect, useCallback, type FC } from 'react'
import { useParams } from 'react-router-dom'
import type { PublishedDashboard } from '../types/publish'
import { getPublishedDashboard, authenticateViewer } from '../lib/publish-api'
import DashboardRenderer from '../components/dashboard/DashboardRenderer'

interface ViewerPageProps {
  embed?: boolean
}

const ViewerPage: FC<ViewerPageProps> = ({ embed = false }) => {
  const { slug } = useParams<{ slug: string }>()
  const [dashboard, setDashboard] = useState<PublishedDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [needsAuth, setNeedsAuth] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authenticating, setAuthenticating] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    getPublishedDashboard(slug)
      .then((data) => {
        if (data.requiresAuth) {
          setNeedsAuth(true)
        } else {
          setDashboard(data)
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  const handleAuth = useCallback(async () => {
    if (!slug || !password.trim()) return
    setAuthenticating(true)
    setAuthError('')
    try {
      const result = await authenticateViewer(slug, password)
      if (result.authenticated && result.dashboard) {
        setDashboard(result.dashboard)
        setNeedsAuth(false)
      } else {
        setAuthError('Incorrect password')
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setAuthenticating(false)
    }
  }, [slug, password])

  // ── Loading state ──────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-pub-bg font-pub-sans flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-48 h-3 bg-pub-border mx-auto" style={{ borderRadius: 6 }} />
          <div className="w-32 h-3 bg-pub-surface mx-auto" style={{ borderRadius: 6 }} />
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-pub-bg font-pub-sans flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 px-6">
          <p className="font-pub-sans text-[10px] text-pub-text-muted">Error</p>
          <h1 className="font-pub-sans text-2xl font-semibold text-pub-text">Dashboard not found</h1>
          <p className="text-sm text-pub-text-muted">{error}</p>
        </div>
      </div>
    )
  }

  // ── Password gate ──────────────────────────────────────────────

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-pub-bg font-pub-sans flex items-center justify-center">
        <div className="max-w-sm w-full px-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 mx-auto bg-pub-surface flex items-center justify-center" style={{ borderRadius: 6 }}>
              <svg className="w-5 h-5 text-pub-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <p className="font-pub-sans text-[10px] text-pub-text-muted">Protected</p>
            <h1 className="font-pub-sans text-lg font-medium text-pub-text">Enter password to view</h1>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              placeholder="Password"
              className="w-full px-4 py-3 font-pub-sans text-sm text-pub-text bg-white border border-pub-border focus:border-pub-text outline-none transition-colors"
              style={{ borderRadius: 4 }}
              autoFocus
            />
            {authError && <p className="font-pub-sans text-xs text-ds-error">{authError}</p>}
            <button
              onClick={handleAuth}
              disabled={authenticating || !password.trim()}
              className="w-full px-4 py-3 font-pub-sans text-xs bg-ds-accent text-white hover:bg-ds-accent-hover transition-colors disabled:opacity-50"
              style={{ borderRadius: 4 }}
            >
              {authenticating ? 'Verifying...' : 'View Dashboard'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Dashboard viewer ───────────────────────────────────────────

  if (!dashboard) return null

  const { branding } = dashboard
  const fontLink = branding.fontFamily && branding.fontFamily !== 'IBM Plex Sans'
    ? `https://fonts.googleapis.com/css2?family=${encodeURIComponent(branding.fontFamily)}:wght@400;500;600;700&display=swap`
    : null

  return (
    <div
      className="min-h-screen bg-pub-bg font-pub-sans"
      style={{ fontFamily: branding.fontFamily ? `"${branding.fontFamily}", sans-serif` : undefined }}
    >
      {/* Google Font link */}
      {fontLink && (
        <link rel="stylesheet" href={fontLink} />
      )}

      {/* Header — not shown in embed mode */}
      {!embed && (
        <header
          className="border-b border-pub-border bg-white"
          style={{ borderColor: branding.primaryColor ? `${branding.primaryColor}10` : undefined }}
        >
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {branding.logoUrl && (
                <img
                  src={branding.logoUrl}
                  alt="Logo"
                  className="h-8 object-contain"
                />
              )}
              <h1
                className="font-pub-sans text-base font-semibold"
                style={{ color: branding.primaryColor || '#1A1A1A' }}
              >
                {dashboard.dashboardName}
              </h1>
            </div>
          </div>
        </header>
      )}

      {/* Dashboard Grid */}
      <main className={`max-w-7xl mx-auto ${embed ? 'p-4' : 'px-6 py-8'}`}>
        <DashboardRenderer
          layout={dashboard.layout}
          sheets={dashboard.sheets}
          data={dashboard.data}
        />
      </main>

      {/* Powered by DashShip footer */}
      {branding.poweredByDashShip && !embed && (
        <footer className="border-t border-pub-border bg-white mt-12">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
            <p className="font-pub-sans text-[10px] text-[#BCBCBC]">
              Powered by{' '}
              <span className="text-[#BCBCBC] font-medium">DashShip</span>
            </p>
          </div>
        </footer>
      )}
    </div>
  )
}

export default ViewerPage
