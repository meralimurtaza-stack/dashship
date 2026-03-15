import { supabase } from './supabase'
import type { Sheet } from '../types/sheet'
import type { DashboardLayout } from '../types/sheet'

export interface DashboardRecord {
  id: string
  dataSourceId: string | null
  name: string
  status: 'draft' | 'published'
  sheets: Sheet[]
  layout: DashboardLayout
  data: Record<string, unknown>[]
  publishedSlug: string | null
  createdAt: string
  updatedAt: string
}

export async function saveDashboard(params: {
  id?: string
  dataSourceId?: string
  name: string
  status?: 'draft' | 'published'
  sheets: Sheet[]
  layout: DashboardLayout
  data: Record<string, unknown>[]
  publishedSlug?: string
}): Promise<DashboardRecord> {
  const record = {
    ...(params.id ? { id: params.id } : {}),
    data_source_id: params.dataSourceId ?? null,
    name: params.name,
    status: params.status ?? 'draft',
    sheets: params.sheets,
    layout: params.layout,
    data: params.data,
    published_slug: params.publishedSlug ?? null,
  }

  const { data, error } = await supabase
    .from('dashboards')
    .upsert(record, { onConflict: 'id' })
    .select()
    .single()

  if (error) throw new Error(`Save dashboard failed: ${error.message}`)

  return mapRow(data)
}

export async function listDashboards(): Promise<DashboardRecord[]> {
  const { data, error } = await supabase
    .from('dashboards')
    .select('*')
    .order('updated_at', { ascending: false })

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
    dataSourceId: d.data_source_id,
    name: d.name,
    status: d.status,
    sheets: d.sheets,
    layout: d.layout,
    data: d.data,
    publishedSlug: d.published_slug,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }
}
