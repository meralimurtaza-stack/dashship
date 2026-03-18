import { supabase } from './supabase'
import type { DataSchema, DataProfile, DataSource } from '../types/datasource'
import { parseFile } from '../engine/parser'

/**
 * Supabase table: data_sources
 *
 * CREATE TABLE data_sources (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   project_id UUID NOT NULL REFERENCES projects(id),
 *   name TEXT NOT NULL,
 *   file_path TEXT,
 *   file_name TEXT,
 *   file_type TEXT,
 *   file_size_bytes BIGINT,
 *   schema JSONB,
 *   profile JSONB,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now()
 * );
 */

const BUCKET = 'data-files'

// ── Helper: map a DB row to a DataSource ─────────────────────────

function rowToDataSource(d: Record<string, unknown>): DataSource {
  return {
    id: d.id as string,
    projectId: d.project_id as string,
    name: d.name as string,
    fileName: (d.file_name as string) ?? '',
    fileType: (d.file_type as 'csv' | 'xlsx') ?? 'csv',
    fileSizeBytes: Number(d.file_size_bytes ?? 0),
    filePath: (d.file_path as string) ?? null,
    schema: d.schema as DataSchema,
    profile: d.profile as DataProfile,
    createdAt: d.created_at as string,
    updatedAt: d.updated_at as string,
  }
}

// ── Upload file to storage bucket ────────────────────────────────

export async function uploadFileToStorage(
  file: File,
  path: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return path
}

// ── Save data source record ──────────────────────────────────────

export async function saveDataSource(params: {
  projectId: string
  name: string
  fileName: string
  fileType: 'csv' | 'xlsx'
  fileSizeBytes: number
  filePath: string | null
  schema: DataSchema
  profile: DataProfile
}): Promise<DataSource> {
  const { data, error } = await supabase
    .from('data_sources')
    .insert({
      project_id: params.projectId,
      name: params.name,
      file_name: params.fileName,
      file_type: params.fileType,
      file_size_bytes: params.fileSizeBytes,
      file_path: params.filePath,
      schema: params.schema,
      profile: params.profile,
    })
    .select()
    .single()

  if (error) throw new Error(`Save failed: ${error.message}`)

  return rowToDataSource(data)
}

// ── Download & Parse Rows ────────────────────────────────────────

export async function downloadDataSourceRows(
  filePath: string,
  fileName: string
): Promise<Record<string, unknown>[]> {
  console.log('[datasource-storage] Downloading file from:', filePath)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(filePath)

  if (error) throw new Error(`Download failed: ${error.message}`)
  if (!data) throw new Error('Download returned empty data')

  console.log('[datasource-storage] Downloaded blob:', data.size, 'bytes')

  // Convert Blob to File (parser expects File)
  const file = new File([data], fileName, { type: data.type })
  const result = await parseFile(file)

  console.log('[datasource-storage] Parsed rows:', result.rows.length, 'headers:', result.headers)

  return result.rows
}

// ── Delete data source ───────────────────────────────────────────

export async function deleteDataSource(id: string, filePath: string | null): Promise<void> {
  // Delete file from storage if path exists
  if (filePath) {
    await supabase.storage.from(BUCKET).remove([filePath])
  }

  // Delete metadata from table
  const { error } = await supabase
    .from('data_sources')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Delete failed: ${error.message}`)
}

// ── List data sources ────────────────────────────────────────────

export async function listDataSources(projectId?: string): Promise<DataSource[]> {
  let query = supabase
    .from('data_sources')
    .select('*')
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) throw new Error(`Fetch failed: ${error.message}`)

  return (data ?? []).map(rowToDataSource)
}
