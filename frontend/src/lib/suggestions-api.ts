import type { DataSchema, DataProfile } from '../types/datasource'
import type { Suggestion } from '../types/suggestion'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface ColumnPayload {
  name: string
  display_name: string | null
  type: string
  role: string
  sample_values: string[]
  null_count: number
  null_percent: number
  unique_count: number | null
}

export async function fetchSuggestions(
  schema: DataSchema,
  profile: DataProfile,
  fileName?: string,
): Promise<Suggestion[]> {
  const columns: ColumnPayload[] = schema.columns.map((col) => {
    const colProfile = profile.columns[col.name]
    let nullCount = 0
    let nullPercent = 0
    let uniqueCount: number | null = null

    if (colProfile) {
      nullCount = colProfile.nullCount
      nullPercent = colProfile.nullPercent
      if (colProfile.type === 'categorical') {
        uniqueCount = colProfile.uniqueCount
      }
    }

    return {
      name: col.name,
      display_name: col.displayName || null,
      type: col.type,
      role: col.role,
      sample_values: col.sampleValues.slice(0, 5),
      null_count: nullCount,
      null_percent: nullPercent,
      unique_count: uniqueCount,
    }
  })

  const res = await fetch(`${API_BASE}/api/data/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      columns,
      row_count: schema.rowCount,
      file_name: fileName || null,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  const data = await res.json()
  return (data.suggestions || []).map((s: Record<string, string>) => ({
    id: s.id,
    action: s.action,
    column: s.column,
    fromValue: s.from_value,
    toValue: s.to_value,
    reason: s.reason,
  }))
}
