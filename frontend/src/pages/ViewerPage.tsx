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
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-48 h-3 bg-gray-200 mx-auto" style={{ borderRadius: 2 }} />
          <div className="w-32 h-3 bg-gray-100 mx-auto" style={{ borderRadius: 2 }} />
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 px-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">Error</p>
          <h1 className="font-mono text-2xl font-semibold text-ink">Dashboard not found</h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  // ── Password gate ──────────────────────────────────────────────

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="max-w-sm w-full px-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 mx-auto bg-gray-100 flex items-center justify-center" style={{ borderRadius: 2 }}>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">Protected</p>
            <h1 className="font-mono text-lg font-semibold text-ink">Enter password to view</h1>
          </div>

          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              placeholder="Password"
              className="w-full px-4 py-3 font-mono text-sm text-ink bg-white border border-gray-200 focus:border-gray-900 outline-none transition-colors"
              style={{ borderRadius: 2 }}
              autoFocus
            />
            {authError && <p className="font-mono text-xs text-danger">{authError}</p>}
            <button
              onClick={handleAuth}
              disabled={authenticating || !password.trim()}
              className="w-full px-4 py-3 font-mono text-xs uppercase tracking-wide bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
              style={{ borderRadius: 2 }}
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
      className="min-h-screen bg-page"
      style={{ fontFamily: branding.fontFamily ? `"${branding.fontFamily}", sans-serif` : undefined }}
    >
      {/* Google Font link */}
      {fontLink && (
        <link rel="stylesheet" href={fontLink} />
      )}

      {/* Header — not shown in embed mode */}
      {!embed && (
        <header
          className="border-b border-gray-200 bg-white"
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
                className="font-mono text-base font-semibold"
                style={{ color: branding.primaryColor || '#0E0D0D' }}
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
        <footer className="border-t border-gray-200 bg-white mt-12">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Powered by{' '}
              <span className="text-gray-600 font-semibold">DashShip</span>
            </p>
          </div>
        </footer>
      )}
    </div>
  )
}

export default ViewerPage
