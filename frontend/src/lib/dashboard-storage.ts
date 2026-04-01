import { supabase } from './supabase'
import type { Sheet } from '../types/sheet'
import type { DashboardLayout } from '../types/sheet'

export interface PublishConfig {
  logoUrl?: string | null
  brandColor?: string | null
  fontFamily?: string | null
  showHeader?: boolean
  showFilters?: boolean
  [key: string]: unknown
}

export interface DashboardRecord {
  id: string
  projectId: string
  conversationId: string | null
  name: string
  status: 'draft' | 'published'
  sheets: Sheet[]
  layout: DashboardLayout
  jsxCode: string | null
  publishedSlug: string | null
  publishConfig: PublishConfig | null
  version: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export async function saveDashboard(params: {
  id?: string
  projectId: string
  conversationId?: string | null
  name: string
  status?: 'draft' | 'published'
  sheets?: Sheet[]
  layout?: DashboardLayout
  jsxCode?: string | null
  publishedSlug?: string | null
  publishConfig?: PublishConfig | null
  publishedAt?: string | null
}): Promise<DashboardRecord> {
  const record: Record<string, unknown> = {
    ...(params.id ? { id: params.id } : {}),
    project_id: params.projectId,
    conversation_id: params.conversationId ?? null,
    name: params.name,
    status: params.status ?? 'draft',
    sheets: params.sheets,
    layout: params.layout ?? { columns: 12, rowHeight: 60, items: [] },
    published_slug: params.publishedSlug ?? null,
    publish_config: params.publishConfig ?? null,
  }
  if (params.jsxCode !== undefined) {
    record.jsx_code = params.jsxCode
  }
  if (params.publishedAt !== undefined) {
    record.published_at = params.publishedAt
  }

  const { data, error } = await supabase
    .from('dashboards')
    .upsert(record, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw new Error(`Save dashboard failed: ${error.message}`)

  return mapRow(data)
}

export async function listDashboards(projectId?: string): Promise<DashboardRecord[]> {
  let query = supabase
    .from('dashboards')
    .select('*')
    .order('updated_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw new Error(`Fetch dashboards failed: ${error.message}`)

  return (data ?? []).map(mapRow)
}

export async function getDashboard(id: string): Promise<DashboardRecord> {
  const { data, error } = await supabase
    .from('dashboards')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw new Error(`Fetch dashboard failed: ${error.message}`)

  return mapRow(data)
}

export async function deleteDashboard(id: string): Promise<void> {
  const { error } = await supabase
    .from('dashboards')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Delete dashboard failed: ${error.message}`)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRow(d: any): DashboardRecord {
  return {
    id: d.id,
    projectId: d.project_id,
    conversationId: d.conversation_id ?? null,
    name: d.name,
    status: d.status,
    sheets: d.sheets,
    layout: d.layout,
    jsxCode: d.jsx_code ?? null,
    publishedSlug: d.published_slug ?? null,
    publishConfig: d.publish_config ?? null,
    version: d.version ?? 1,
    publishedAt: d.published_at ?? null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }
}
