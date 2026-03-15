import { supabase } from './supabase'
import type { DataSchema, DataProfile, DataSource } from '../types/datasource'
import { parseFile } from '../engine/parser'

/**
 * Supabase table: data_sources
 *
 * CREATE TABLE data_sources (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   project_id UUID REFERENCES projects(id),
 *   name TEXT NOT NULL,
 *   file_name TEXT NOT NULL,
 *   file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
 *   file_size_bytes BIGINT NOT NULL,
 *   storage_path TEXT NOT NULL,
 *   schema JSONB NOT NULL,
 *   profile JSONB NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT now(),
 *   updated_at TIMESTAMPTZ DEFAULT now()
 * );
 */

const BUCKET = 'data-files'

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

export async function saveDataSource(params: {
  name: string
  fileName: string
  fileType: 'csv' | 'xlsx'
  fileSizeBytes: number
  storagePath: string
  schema: DataSchema
  profile: DataProfile
  projectId?: string
}): Promise<DataSource> {
  const { data, error } = await supabase
    .from('data_sources')
    .insert({
      name: params.name,
      file_name: params.fileName,
      file_type: params.fileType,
      file_size_bytes: params.fileSizeBytes,
      storage_path: params.storagePath,
      schema: params.schema,
      profile: params.profile,
      project_id: params.projectId ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(`Save failed: ${error.message}`)

  return {
    id: data.id,
    projectId: data.project_id,
    name: data.name,
    fileName: data.file_name,
    fileType: data.file_type,
    fileSizeBytes: data.file_size_bytes,
    storagePath: data.storage_path,
    schema: data.schema,
    profile: data.profile,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

// ── Download & Parse Rows ────────────────────────────────────────

export async function downloadDataSourceRows(
  storagePath: string,
  fileName: string
): Promise<Record<string, unknown>[]> {
  console.log('[datasource-storage] Downloading file from:', storagePath)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(storagePath)

  if (error) throw new Error(`Download failed: ${error.message}`)
  if (!data) throw new Error('Download returned empty data')

  console.log('[datasource-storage] Downloaded blob:', data.size, 'bytes')

  // Convert Blob to File (parser expects File)
  const file = new File([data], fileName, { type: data.type })
  const result = await parseFile(file)

  console.log('[datasource-storage] Parsed rows:', result.rows.length, 'headers:', result.headers)

  return result.rows
}

export async function deleteDataSource(id: string, storagePath: string): Promise<void> {
  // Delete file from storage
  await supabase.storage.from(BUCKET).remove([storagePath])

  // Delete metadata from table
  const { error } = await supabase
    .from('data_sources')
    .delete()
    .eq('id', id)

  if (error) throw new Error(`Delete failed: ${error.message}`)
}

export async function listDataSources(): Promise<DataSource[]> {
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Fetch failed: ${error.message}`)

  return (data ?? []).map((d) => ({
    id: d.id,
    projectId: d.project_id,
    name: d.name,
    fileName: d.file_name,
    fileType: d.file_type,
    fileSizeBytes: d.file_size_bytes,
    storagePath: d.storage_path,
    schema: d.schema,
    profile: d.profile,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }))
}
