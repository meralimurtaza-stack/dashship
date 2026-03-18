import type { ChatDataContext } from '../types/chat'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface DataRecommendation {
  id: string
  type: 'rename' | 'reclassify' | 'type_change' | 'hide'
  field: string
  to?: string
  from_role?: string
  to_role?: string
  from_type?: string
  to_type?: string
  reason: string
}

export interface DataReviewResponse {
  summary: string
  recommendations: DataRecommendation[]
}

export async function reviewDataSchema(dataContext: ChatDataContext): Promise<DataReviewResponse> {
  const res = await fetch(`${API_BASE}/api/data-review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_name: dataContext.sourceName,
      row_count: dataContext.rowCount,
      columns: dataContext.columns.map((c) => ({
        name: c.name,
        display_name: c.displayName,
        type: c.type,
        role: c.role,
        sample_values: c.sampleValues,
      })),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  return res.json()
}
