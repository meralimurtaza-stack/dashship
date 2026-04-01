import type { PublishConfig, PublishedDashboard, EmailScheduleConfig } from '../types/publish'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Publish API ──────────────────────────────────────────────────

export async function publishDashboard(config: PublishConfig): Promise<{ slug: string; url: string }> {
  const body: Record<string, unknown> = {
    dashboard_name: config.dashboardName,
    slug: config.slug,
    access_level: config.accessLevel,
    password: config.password,
    allowed_emails: config.allowedEmails,
    branding: {
      logo_url: config.branding.logoUrl,
      primary_color: config.branding.primaryColor,
      font_family: config.branding.fontFamily,
      powered_by_dashship: config.branding.poweredByDashShip,
    },
    embed_enabled: config.embedEnabled,
    jsx_code: config.jsxCode,
    data: config.data,
  }
  if (config.userId) {
    body.user_id = config.userId
  }
  if (config.projectId) {
    body.project_id = config.projectId
  }
  if (config.dashboardId) {
    body.dashboard_id = config.dashboardId
  }
  const res = await fetch(`${API_URL}/api/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Publish failed' }))
    throw new Error(err.detail || 'Publish failed')
  }
  return res.json()
}

function toDashboard(raw: Record<string, unknown>): PublishedDashboard {
  const branding = raw.branding as Record<string, unknown> | undefined
  return {
    id: raw.id as string,
    slug: raw.slug as string,
    dashboardName: (raw.dashboard_name ?? raw.dashboardName) as string,
    accessLevel: (raw.access_level ?? raw.accessLevel) as PublishedDashboard['accessLevel'],
    branding: {
      logoUrl: branding?.logo_url as string | undefined ?? branding?.logoUrl as string | undefined,
      primaryColor: branding?.primary_color as string | undefined ?? branding?.primaryColor as string | undefined,
      fontFamily: branding?.font_family as string | undefined ?? branding?.fontFamily as string | undefined,
      poweredByDashShip: (branding?.powered_by_dashship ?? branding?.poweredByDashShip ?? true) as boolean,
    },
    jsxCode: (raw.jsx_code ?? raw.jsxCode) as string,
    data: raw.data as PublishedDashboard['data'],
    requiresAuth: (raw.requires_auth ?? raw.requiresAuth ?? false) as boolean,
  }
}

export async function getPublishedDashboard(slug: string): Promise<PublishedDashboard> {
  const res = await fetch(`${API_URL}/api/view/${slug}`)
  if (!res.ok) {
    if (res.status === 404) throw new Error('Dashboard not found')
    throw new Error('Failed to load dashboard')
  }
  const raw = await res.json()
  return toDashboard(raw)
}

export async function authenticateViewer(
  slug: string,
  password: string
): Promise<{ authenticated: boolean; dashboard: PublishedDashboard }> {
  const res = await fetch(`${API_URL}/api/view/${slug}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) {
    if (res.status === 401) throw new Error('Incorrect password')
    throw new Error('Authentication failed')
  }
  const raw = await res.json()
  return {
    authenticated: raw.authenticated,
    dashboard: toDashboard(raw.dashboard),
  }
}

export function getEmbedCode(slug: string): string {
  const origin = window.location.origin
  const url = `${origin}/embed/${slug}`
  return `<iframe src="${url}" width="100%" height="600" frameborder="0" style="border: none;"></iframe>`
}

export function getViewUrl(slug: string): string {
  return `${window.location.origin}/view/${slug}`
}

// ── Email API ────────────────────────────────────────────────────

function emailConfigToSnake(config: EmailScheduleConfig) {
  return {
    dashboard_id: config.dashboardId,
    recipients: config.recipients,
    frequency: config.frequency,
    day_of_week: config.dayOfWeek,
    day_of_month: config.dayOfMonth,
    time_utc: config.timeUtc,
    format: config.format,
    subject: config.subject,
    enabled: config.enabled,
  }
}

export async function saveEmailSchedule(config: EmailScheduleConfig): Promise<{ id: string }> {
  const res = await fetch(`${API_URL}/api/email/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailConfigToSnake(config)),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Save failed' }))
    throw new Error(err.detail || 'Save failed')
  }
  return res.json()
}

export async function sendTestEmail(config: EmailScheduleConfig): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/api/email/send-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(emailConfigToSnake(config)),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Send failed' }))
    throw new Error(err.detail || 'Send failed')
  }
  return res.json()
}
