import { supabase } from './supabase'
import type { Sheet } from '../types/sheet'
import type { DashboardLayout } from '../types/sheet'
import type { ChatMessage, ChatDataContext } from '../types/chat'
import type { CalculatedField } from '../engine/formulaParser'

export interface DashboardRecord {
  id: string
  dataSourceId: string | null
  name: string
  status: 'draft' | 'published'
  sheets: Sheet[]
  layout: DashboardLayout
  data: Record<string, unknown>[]
  publishedSlug: string | null
  chatMessages: ChatMessage[]
  dataContext: ChatDataContext | null
  calculatedFields: CalculatedField[]
  createdAt: string
  updatedAt: string
}

export async function saveDashboard(params: {
  id?: string
  dataSourceId?: string
  name: string
  status?: 'draft' | 'published'
  sheets: Sheet[]
  layout?: DashboardLayout
  data?: Record<string, unknown>[]
  publishedSlug?: string
  chatMessages?: ChatMessage[]
  dataContext?: ChatDataContext | null
  calculatedFields?: CalculatedField[]
}): Promise<DashboardRecord> {
  const record = {
    ...(params.id ? { id: params.id } : {}),
    data_source_id: params.dataSourceId ?? null,
    name: params.name,
    status: params.status ?? 'draft',
    sheets: params.sheets,
    layout: params.layout ?? { columns: 12, rowHeight: 60, items: [] },
    data: params.data ?? [],
    published_slug: params.publishedSlug ?? null,
    chat_messages: params.chatMessages ?? [],
    data_context: params.dataContext ?? null,
    calculated_fields: params.calculatedFields ?? [],
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
    chatMessages: d.chat_messages || [],
    dataContext: d.data_context || null,
    calculatedFields: d.calculated_fields || [],
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }
}
