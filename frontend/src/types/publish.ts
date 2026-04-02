// ── Publish Config ───────────────────────────────────────────────

export type AccessLevel = 'public' | 'password' | 'invited'

export interface PublishBranding {
  logoUrl?: string
  primaryColor?: string
  fontFamily?: string
  poweredByDashShip: boolean
}

export interface PublishConfig {
  id?: string
  projectId?: string
  dashboardId?: string
  userId?: string
  dashboardName: string
  slug: string
  accessLevel: AccessLevel
  password?: string
  allowedEmails?: string[]
  branding: PublishBranding
  embedEnabled: boolean
  jsxCode: string
  data: Record<string, unknown>[]
  createdAt?: string
  updatedAt?: string
}

export interface PublishedDashboard {
  id: string
  slug: string
  dashboardName: string
  accessLevel: AccessLevel
  branding: PublishBranding
  jsxCode: string
  data: Record<string, unknown>[]
  requiresAuth: boolean
}

// ── Email Report Config ─────────────────────────────────────────

export type EmailScheduleFrequency = 'daily' | 'weekly' | 'monthly'
export type EmailFormat = 'html' | 'pdf'

export interface EmailScheduleConfig {
  id?: string
  dashboardId: string
  recipients: string[]
  frequency: EmailScheduleFrequency
  dayOfWeek?: number // 0-6 for weekly
  dayOfMonth?: number // 1-28 for monthly
  timeUtc: string // HH:mm
  format: EmailFormat
  subject: string
  enabled: boolean
  createdAt?: string
}

// ── Google Fonts presets ────────────────────────────────────────

export const FONT_PRESETS = [
  { label: 'Manrope', value: 'Manrope' },
  { label: 'Inter', value: 'Inter' },
  { label: 'DM Sans', value: 'DM Sans' },
  { label: 'Source Sans 3', value: 'Source Sans 3' },
  { label: 'Lato', value: 'Lato' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'Nunito', value: 'Nunito' },
] as const

export const DEFAULT_BRANDING: PublishBranding = {
  primaryColor: '#3D82F6',
  fontFamily: 'Manrope',
  poweredByDashShip: true,
}
