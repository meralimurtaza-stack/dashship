const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Types ────────────────────────────────────────────────────────

export interface Dock {
  id: string
  slug: string
  displayName: string
  logoUrl: string | null
}

export interface DockDashboard {
  id: string
  slug: string
  dashboardName: string
  branding: {
    logo_url?: string
    primary_color?: string
    font_family?: string
    powered_by_dashship?: boolean
  }
  createdAt: string | null
  updatedAt: string | null
  publishedAt: string | null
  accessLevel: string
  version: number
}

export interface DockWithDashboards extends Dock {
  userId: string
  dashboards: DockDashboard[]
}

// ── API ──────────────────────────────────────────────────────────

export async function createDock(userId: string, displayName: string): Promise<Dock> {
  const res = await fetch(`${API_URL}/api/dock/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, display_name: displayName }),
  })
  if (!res.ok) throw new Error('Failed to create dock')
  const data = await res.json()
  return {
    id: data.id,
    slug: data.slug,
    displayName: data.display_name,
    logoUrl: data.logo_url,
  }
}

export async function getDockByUser(userId: string): Promise<Dock | null> {
  const res = await fetch(`${API_URL}/api/dock/by-user/${userId}`)
  if (!res.ok) return null
  const data = await res.json()
  if (!data) return null
  return {
    id: data.id,
    slug: data.slug,
    displayName: data.display_name,
    logoUrl: data.logo_url,
  }
}

export async function getDock(slug: string): Promise<DockWithDashboards> {
  const res = await fetch(`${API_URL}/api/dock/${slug}`)
  if (!res.ok) {
    if (res.status === 404) throw new Error('not_found')
    throw new Error('Failed to load dock')
  }
  const data = await res.json()
  return {
    id: data.id,
    slug: data.slug,
    displayName: data.display_name,
    logoUrl: data.logo_url,
    userId: data.user_id,
    dashboards: data.dashboards || [],
  }
}

export async function uploadDockLogo(file: File, dockSlug: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('dock_slug', dockSlug)

  const res = await fetch(`${API_URL}/api/dock/upload-logo`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Logo upload failed')
  const data = await res.json()
  return data.logo_url
}
