import { useState, useEffect, useRef, useCallback, useMemo, type FC } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDock, uploadDockLogo, type DockWithDashboards, type DockDashboard } from '../lib/dock-api'
import { getPublishedDashboard } from '../lib/publish-api'
import type { PublishedDashboard } from '../types/publish'
import DashboardIframe from '../components/dashboard/DashboardIframe'
import DataDictionaryPanel from '../components/data/DataDictionaryPanel'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// ── Helpers ──────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function getInitialColor(name: string): string {
  const colors = ['#1C3360', '#3B9B6F', '#C69026', '#C45454', '#6B6B65', '#C8963E']
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// ── Chart preview shapes ─────────────────────────────────────────

const PREVIEW_PATTERNS = [
  // Bar chart
  (i: number) => (
    <svg key={i} viewBox="0 0 120 60" className="w-full h-full" preserveAspectRatio="none">
      <rect x="10" y="30" width="16" height="30" fill="currentColor" opacity={0.12} rx="2" />
      <rect x="32" y="15" width="16" height="45" fill="currentColor" opacity={0.18} rx="2" />
      <rect x="54" y="22" width="16" height="38" fill="currentColor" opacity={0.14} rx="2" />
      <rect x="76" y="8" width="16" height="52" fill="currentColor" opacity={0.2} rx="2" />
      <rect x="98" y="20" width="16" height="40" fill="currentColor" opacity={0.16} rx="2" />
    </svg>
  ),
  // Line chart
  (i: number) => (
    <svg key={i} viewBox="0 0 120 60" className="w-full h-full" preserveAspectRatio="none">
      <polyline points="5,45 25,30 45,35 65,15 85,25 115,10" fill="none" stroke="currentColor" strokeWidth="2" opacity={0.2} />
      <polyline points="5,50 25,42 45,48 65,30 85,38 115,28" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.12} strokeDasharray="4,3" />
    </svg>
  ),
  // Scatter
  (i: number) => (
    <svg key={i} viewBox="0 0 120 60" className="w-full h-full" preserveAspectRatio="none">
      <circle cx="20" cy="40" r="4" fill="currentColor" opacity={0.15} />
      <circle cx="40" cy="25" r="5" fill="currentColor" opacity={0.2} />
      <circle cx="55" cy="35" r="3" fill="currentColor" opacity={0.12} />
      <circle cx="75" cy="15" r="6" fill="currentColor" opacity={0.18} />
      <circle cx="95" cy="30" r="4" fill="currentColor" opacity={0.14} />
      <circle cx="110" cy="20" r="3" fill="currentColor" opacity={0.16} />
    </svg>
  ),
  // Area
  (i: number) => (
    <svg key={i} viewBox="0 0 120 60" className="w-full h-full" preserveAspectRatio="none">
      <path d="M0,60 L0,40 Q30,20 60,30 Q90,40 120,15 L120,60 Z" fill="currentColor" opacity={0.08} />
      <path d="M0,40 Q30,20 60,30 Q90,40 120,15" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.2} />
    </svg>
  ),
]

// ── Main DockPage ────────────────────────────────────────────────

const DockPage: FC = () => {
  const { slug, dashboardSlug } = useParams<{ slug: string; dashboardSlug?: string }>()
  const navigate = useNavigate()

  const { user } = useAuth()
  const [dock, setDock] = useState<DockWithDashboards | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'not_found' | 'error' | null>(null)

  // Dashboard view state
  const [activeDashboard, setActiveDashboard] = useState<PublishedDashboard | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(false)

  // Dictionary state
  const [dictionaryOpen, setDictionaryOpen] = useState(false)
  const [dictionaryProjectId, setDictionaryProjectId] = useState<string | null>(null)

  // Owner editing state
  const [showSettings, setShowSettings] = useState(false)
  const [editName, setEditName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const isOwner = !!(user?.id && dock?.userId && user.id === dock.userId)

  // Load dock data — try backend first, fall back to direct Supabase
  useEffect(() => {
    if (!slug) return
    setLoading(true)

    getDock(slug)
      .then((dockData) => {
        // If backend returned the dock but with 0 dashboards, try enriching from Supabase
        if (dockData.dashboards.length === 0 && dockData.userId) {
          supabase
            .from('published_dashboards')
            .select('id, slug, dashboard_name, branding, created_at, updated_at, published_at, access_level, version')
            .eq('user_id', dockData.userId)
            .order('updated_at', { ascending: false })
            .then(({ data }) => {
              if (data && data.length > 0) {
                setDock({
                  ...dockData,
                  dashboards: data.map((d: Record<string, unknown>) => ({
                    id: d.id as string,
                    slug: d.slug as string,
                    dashboardName: d.dashboard_name as string,
                    branding: (d.branding || {}) as DockDashboard['branding'],
                    createdAt: d.created_at as string | null,
                    updatedAt: d.updated_at as string | null,
                    publishedAt: d.published_at as string | null,
                    accessLevel: (d.access_level || 'public') as string,
                    version: (d.version as number) || 1,
                  })),
                })
              } else {
                setDock(dockData)
              }
            })
            .catch(() => setDock(dockData))
        } else {
          setDock(dockData)
        }
      })
      .catch(async (err) => {
        // Backend failed — try Supabase directly
        try {
          const { data: dockRow } = await supabase
            .from('docks')
            .select('*')
            .eq('slug', slug)
            .single()

          if (!dockRow) {
            setError('not_found')
            return
          }

          const { data: dashboards } = await supabase
            .from('published_dashboards')
            .select('id, slug, dashboard_name, branding, created_at, updated_at, published_at, access_level, version')
            .eq('user_id', dockRow.user_id)
            .order('updated_at', { ascending: false })

          setDock({
            id: dockRow.id,
            slug: dockRow.slug,
            displayName: dockRow.display_name,
            logoUrl: dockRow.logo_url,
            userId: dockRow.user_id,
            dashboards: (dashboards || []).map((d: Record<string, unknown>) => ({
              id: d.id as string,
              slug: d.slug as string,
              dashboardName: d.dashboard_name as string,
              branding: (d.branding || {}) as DockDashboard['branding'],
              createdAt: d.created_at as string | null,
              updatedAt: d.updated_at as string | null,
              publishedAt: d.published_at as string | null,
              accessLevel: (d.access_level || 'public') as string,
              version: (d.version as number) || 1,
            })),
          })
        } catch {
          setError(err.message === 'not_found' ? 'not_found' : 'error')
        }
      })
      .finally(() => setLoading(false))
  }, [slug])

  // Load dashboard when dashboardSlug is present
  // Try backend first, then fall back to direct Supabase query
  useEffect(() => {
    if (!dashboardSlug || !dock) return
    setDashboardLoading(true)

    // Look up projectId for data dictionary
    supabase
      .from('dashboards')
      .select('project_id')
      .eq('published_slug', dashboardSlug)
      .maybeSingle()
      .then(({ data }) => {
        setDictionaryProjectId(data?.project_id ?? null)
      })

    getPublishedDashboard(dashboardSlug)
      .then(setActiveDashboard)
      .catch(async () => {
        // Backend returned 404 — try Supabase directly
        try {
          const { data, error } = await supabase
            .from('published_dashboards')
            .select('*')
            .eq('slug', dashboardSlug)
            .single()

          if (error || !data) {
            setActiveDashboard(null)
            return
          }

          const branding = data.branding as Record<string, unknown> | undefined
          setActiveDashboard({
            id: data.id,
            slug: data.slug,
            dashboardName: data.dashboard_name,
            accessLevel: data.access_level || 'public',
            branding: {
              logoUrl: branding?.logo_url as string | undefined,
              primaryColor: branding?.primary_color as string | undefined,
              fontFamily: branding?.font_family as string | undefined,
              poweredByDashShip: (branding?.powered_by_dashship ?? true) as boolean,
            },
            jsxCode: data.jsx_code,
            data: data.data || [],
            requiresAuth: false,
          })
        } catch {
          setActiveDashboard(null)
        }
      })
      .finally(() => setDashboardLoading(false))
  }, [dashboardSlug, dock])

  // Clear active dashboard when navigating back to grid
  useEffect(() => {
    if (!dashboardSlug) {
      setActiveDashboard(null)
    }
  }, [dashboardSlug])

  const liveDashboardCount = dock?.dashboards?.length ?? 0

  const handleOpenSettings = useCallback(() => {
    if (dock) {
      setEditName(dock.displayName)
      setShowSettings(true)
    }
  }, [dock])

  const handleSaveName = useCallback(async () => {
    if (!dock || !editName.trim() || editName === dock.displayName) {
      setShowSettings(false)
      return
    }
    setSaving(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const res = await fetch(`${API_URL}/api/dock/${dock.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: editName.trim() }),
      })
      if (res.ok) {
        setDock({ ...dock, displayName: editName.trim() })
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false)
      setShowSettings(false)
    }
  }, [dock, editName])

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !dock) return
    setUploading(true)
    try {
      const logoUrl = await uploadDockLogo(file, dock.slug)
      setDock({ ...dock, logoUrl })
    } catch {
      // silent fail
    } finally {
      setUploading(false)
    }
  }, [dock])

  // Override the global min-width:1024px on body for this public page
  useEffect(() => {
    document.body.style.minWidth = 'unset'
    document.body.style.overflowX = 'unset'
    return () => {
      document.body.style.minWidth = ''
      document.body.style.overflowX = ''
    }
  }, [])

  // ── Loading ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <div className="space-y-3 text-center">
          <div className="w-40 h-2.5 mx-auto" style={{ background: '#E8E8E6', borderRadius: 6 }} />
          <div className="w-28 h-2.5 mx-auto" style={{ background: '#F0F0EE', borderRadius: 6 }} />
        </div>
      </div>
    )
  }

  // ── Not Found ────────────────────────────────────────────────

  if (error === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8', fontFamily: '"IBM Plex Sans", sans-serif' }}>
        <div className="text-center space-y-4 px-6 max-w-md">
          <div className="w-14 h-14 mx-auto flex items-center justify-center" style={{ background: '#F0F0EE', borderRadius: 12 }}>
            <svg className="w-7 h-7" fill="none" stroke="#9E9E96" viewBox="0 0 24 24" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 22, fontWeight: 500, color: '#0E0D0D' }}>
            This Dock doesn't exist
          </h1>
          <p style={{ fontFamily: '"IBM Plex Sans", sans-serif', fontSize: 14, color: '#8A8A86', lineHeight: 1.6 }}>
            Check the URL or contact the person who shared it.
          </p>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────

  if (error || !dock) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8', fontFamily: '"IBM Plex Sans", sans-serif' }}>
        <div className="text-center space-y-3 px-6">
          <p style={{ fontSize: 14, color: '#8A8A86' }}>Something went wrong loading this Dock.</p>
        </div>
      </div>
    )
  }

  // ── Dashboard View (inside Dock wrapper) ─────────────────────

  if (dashboardSlug) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF8', fontFamily: '"IBM Plex Sans", sans-serif' }}>
        {/* Dock header bar */}
        <header
          className="shrink-0 flex items-center justify-between px-6"
          style={{
            height: 56,
            background: '#FFFFFF',
            borderBottom: '0.5px solid #E8E8E6',
          }}
        >
          <div className="flex items-center gap-3">
            <DockLogo dock={dock} size={32} />
            <span style={{ fontSize: 14, fontWeight: 500, color: '#0E0D0D' }}>
              {dock.displayName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {dictionaryProjectId && (
              <button
                onClick={() => setDictionaryOpen(true)}
                className="flex items-center gap-1.5 transition-colors"
                style={{ fontSize: 12, color: '#8A8A86', fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.05em' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0E0D0D')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8A8A86')}
              >
                Dictionary
              </button>
            )}
            <button
              onClick={() => navigate(`/dock/${slug}`)}
              className="flex items-center gap-1.5 transition-colors"
              style={{ fontSize: 13, color: '#8A8A86', fontFamily: '"IBM Plex Sans", sans-serif' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0E0D0D')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8A8A86')}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              All Dashboards
            </button>
          </div>
        </header>

        {/* Dashboard content */}
        <main className="flex-1">
          {dashboardLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-40 h-2.5 mx-auto" style={{ background: '#E8E8E6', borderRadius: 6 }} />
            </div>
          ) : activeDashboard ? (
            <div className="max-w-7xl mx-auto px-6 py-8">
              <DashboardIframe jsxCode={activeDashboard.jsxCode} data={activeDashboard.data} />
            </div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p style={{ fontSize: 14, color: '#8A8A86' }}>Dashboard not found</p>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="shrink-0 py-6 text-center">
          <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#BCBCBC', letterSpacing: '0.04em' }}>
            Powered by DashShip
          </p>
        </footer>

        {/* Data Dictionary Panel (read-only for viewers) */}
        {dictionaryProjectId && (
          <DataDictionaryPanel
            projectId={dictionaryProjectId}
            isOpen={dictionaryOpen}
            onClose={() => setDictionaryOpen(false)}
            readOnly
          />
        )}
      </div>
    )
  }

  // ── Grid View (Dock homepage) ────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FAFAF8', fontFamily: '"IBM Plex Sans", sans-serif' }}>
      {/* Header */}
      <header className="shrink-0 px-6 py-8 sm:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DockLogo dock={dock} size={40} />
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 500, color: '#0E0D0D', margin: 0, lineHeight: 1.3 }}>
                  {dock.displayName}
                </h1>
                <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#8A8A86', marginTop: 2, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Dashboard Dock
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isOwner && (
                <button
                  onClick={handleOpenSettings}
                  className="flex items-center gap-1.5 transition-colors"
                  style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#8A8A86', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#0E0D0D')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#8A8A86')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  Settings
                </button>
              )}
              <div className="hidden sm:flex items-center gap-2">
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#8A8A86' }}>
                  {liveDashboardCount} dashboard{liveDashboardCount !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1" style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#3B9B6F' }}>
                  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#3B9B6F' }} />
                  Live
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 lg:px-12 pb-6">
          <div
            className="animate-fadeIn"
            style={{
              background: '#FFFFFF',
              border: '0.5px solid #E8E8E6',
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#8A8A86', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Dock Settings
              </p>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 transition-colors"
                style={{ color: '#8A8A86' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0E0D0D')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#8A8A86')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Display Name */}
              <div>
                <label
                  style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#8A8A86', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}
                >
                  Company / Display Name
                </label>
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      fontSize: 14,
                      fontFamily: '"IBM Plex Sans", sans-serif',
                      color: '#0E0D0D',
                      background: '#FAFAF8',
                      border: '0.5px solid #E8E8E6',
                      borderRadius: 8,
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.currentTarget.style.borderColor = '#0E0D0D')}
                    onBlur={(e) => (e.currentTarget.style.borderColor = '#E8E8E6')}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    style={{
                      padding: '8px 16px',
                      fontSize: 11,
                      fontFamily: '"IBM Plex Mono", monospace',
                      fontWeight: 500,
                      color: '#FFFFFF',
                      background: '#1C3360',
                      border: 'none',
                      borderRadius: 8,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.6 : 1,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label
                  style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#8A8A86', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}
                >
                  Logo
                </label>
                <div className="flex items-center gap-3">
                  {dock.logoUrl ? (
                    <img src={dock.logoUrl} alt="Logo" style={{ height: 36, width: 'auto', objectFit: 'contain', borderRadius: 6 }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: 6, background: '#F0F0EE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg className="w-4 h-4" fill="none" stroke="#9E9E96" viewBox="0 0 24 24" strokeWidth={1.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploading}
                    style={{
                      padding: '8px 14px',
                      fontSize: 11,
                      fontFamily: '"IBM Plex Mono", monospace',
                      color: '#0E0D0D',
                      background: 'transparent',
                      border: '0.5px solid #E8E8E6',
                      borderRadius: 8,
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      opacity: uploading ? 0.6 : 1,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {uploading ? 'Uploading...' : dock.logoUrl ? 'Change Logo' : 'Upload Logo'}
                  </button>
                </div>
                <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#BCBCBC', marginTop: 6 }}>
                  PNG, JPG, or SVG. Max 5MB.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="max-w-6xl mx-auto w-full px-6 sm:px-8 lg:px-12">
        <div style={{ height: '0.5px', background: '#E8E8E6' }} />
      </div>

      {/* Content */}
      <main className="flex-1 px-6 py-8 sm:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          {liveDashboardCount === 0 ? (
            <EmptyState />
          ) : (
            <>
              <h2 style={{ fontSize: 13, fontWeight: 500, color: '#0E0D0D', marginBottom: 24 }}>
                Your Dashboards
              </h2>
              <div
                className="grid gap-5"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))' }}
              >
                {dock.dashboards.map((d, i) => (
                  <DashboardCard
                    key={d.id}
                    dashboard={d}
                    index={i}
                    onClick={() => navigate(`/dock/${slug}/${d.slug}`)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="shrink-0 py-8 text-center">
        <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, color: '#BCBCBC', letterSpacing: '0.04em' }}>
          Powered by DashShip
        </p>
      </footer>
    </div>
  )
}

// ── Dock Logo ────────────────────────────────────────────────────

const DockLogo: FC<{ dock: DockWithDashboards; size: number }> = ({ dock, size }) => {
  if (dock.logoUrl) {
    return (
      <img
        src={dock.logoUrl}
        alt={dock.displayName}
        style={{ height: size, width: 'auto', objectFit: 'contain' }}
      />
    )
  }

  const initial = dock.displayName.charAt(0).toUpperCase()
  const bgColor = getInitialColor(dock.displayName)

  return (
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: bgColor,
      }}
    >
      <span style={{ color: '#FFFFFF', fontSize: size * 0.42, fontWeight: 500, fontFamily: '"IBM Plex Sans", sans-serif' }}>
        {initial}
      </span>
    </div>
  )
}

// ── Dashboard Card ───────────────────────────────────────────────

const DashboardCard: FC<{ dashboard: DockDashboard; index: number; onClick: () => void }> = ({
  dashboard,
  index,
  onClick,
}) => {
  const pattern = useMemo(() => PREVIEW_PATTERNS[index % PREVIEW_PATTERNS.length], [index])

  return (
    <button
      onClick={onClick}
      className="text-left w-full transition-all duration-200 group"
      style={{
        background: '#FFFFFF',
        border: '0.5px solid #E8E8E6',
        borderRadius: 12,
        overflow: 'hidden',
        animation: `dockCardIn 400ms ease-out ${index * 80}ms both`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Preview area */}
      <div
        className="flex items-center justify-center px-6"
        style={{ height: 120, color: '#0E0D0D', background: '#FAFAF8' }}
      >
        <div className="w-full max-w-[200px] h-16">
          {pattern(index)}
        </div>
      </div>

      {/* Card content */}
      <div className="px-5 py-4" style={{ borderTop: '0.5px solid #E8E8E6' }}>
        <h3 style={{ fontSize: 14, fontWeight: 500, color: '#0E0D0D', margin: 0, lineHeight: 1.4 }}>
          {dashboard.dashboardName}
        </h3>
        <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
          <p style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, color: '#8A8A86', margin: 0 }}>
            Updated {timeAgo(dashboard.publishedAt || dashboard.updatedAt || dashboard.createdAt)}
          </p>
          {dashboard.version > 1 && (
            <span style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10,
              color: '#8A8A86',
              background: '#F0F0EE',
              padding: '1px 6px',
              borderRadius: 4,
            }}>
              v{dashboard.version}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ── Empty State ──────────────────────────────────────────────────

const EmptyState: FC = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div
      className="flex items-center justify-center mb-5"
      style={{ width: 64, height: 64, borderRadius: 16, background: '#F0F0EE' }}
    >
      <svg className="w-8 h-8" fill="none" stroke="#9E9E96" viewBox="0 0 24 24" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    </div>
    <h3 style={{ fontSize: 16, fontWeight: 500, color: '#0E0D0D', margin: 0 }}>
      No dashboards docked yet
    </h3>
    <p style={{ fontSize: 14, color: '#8A8A86', marginTop: 8, maxWidth: 320, lineHeight: 1.5 }}>
      Published dashboards will appear here automatically.
    </p>
  </div>
)

export default DockPage
