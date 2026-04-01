import { supabase } from './supabase'
import type { DictionaryEntry } from '../types/data-dictionary'

// ── Row Mapper ──────────────────────────────────────────────────

function rowToEntry(row: Record<string, unknown>): DictionaryEntry {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    name: row.name as string,
    formula: (row.formula as string) ?? null,
    description: (row.description as string) ?? null,
    source: row.source as 'ai' | 'user',
    createdAt: row.created_at as string,
  }
}

// ── Queries ─────────────────────────────────────────────────────

export async function listEntries(projectId: string): Promise<DictionaryEntry[]> {
  const { data, error } = await supabase
    .from('data_dictionary')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to load dictionary: ${error.message}`)
  return (data ?? []).map(rowToEntry)
}

export async function addEntry(params: {
  projectId: string
  name: string
  formula?: string
  description?: string
  source: 'ai' | 'user'
}): Promise<DictionaryEntry> {
  const { data, error } = await supabase
    .from('data_dictionary')
    .insert({
      project_id: params.projectId,
      name: params.name,
      formula: params.formula ?? null,
      description: params.description ?? null,
      source: params.source,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to add entry: ${error.message}`)
  return rowToEntry(data)
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('data_dictionary')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Failed to delete entry: ${error.message}`)
}

export async function bulkInsertEntries(
  entries: Array<{
    projectId: string
    name: string
    formula?: string
    description?: string
    source: 'ai' | 'user'
  }>
): Promise<DictionaryEntry[]> {
  if (entries.length === 0) return []

  const { data, error } = await supabase
    .from('data_dictionary')
    .insert(
      entries.map((e) => ({
        project_id: e.projectId,
        name: e.name,
        formula: e.formula ?? null,
        description: e.description ?? null,
        source: e.source,
      }))
    )
    .select()

  if (error) throw new Error(`Failed to bulk insert: ${error.message}`)
  return (data ?? []).map(rowToEntry)
}
