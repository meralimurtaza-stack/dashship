import type { ChatDataContext } from '../types/chat'
import type { Sheet, DashboardLayout } from '../types/sheet'
import type { CalculatedField } from '../engine/formulaParser'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface GeneratedDashboard {
  name: string
  sheets: Sheet[]
  layout: DashboardLayout
}

export interface GenerateResponse {
  dashboard: GeneratedDashboard
  warnings: string[]
}

export async function generateDashboard(
  dataContext: ChatDataContext,
  conversationSummary: string,
  calculatedFields?: CalculatedField[]
): Promise<GenerateResponse> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      data_context: {
        source_name: dataContext.sourceName,
        source_id: dataContext.sourceId,
        row_count: dataContext.rowCount,
        columns: dataContext.columns.map((c) => ({
          name: c.name,
          display_name: c.displayName,
          type: c.type,
          role: c.role,
          sample_values: c.sampleValues,
        })),
      },
      conversation_summary: conversationSummary,
      calculated_fields: calculatedFields?.map((cf) => ({
        name: cf.name,
        formula: cf.formula,
      })) ?? [],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Generation failed' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  return res.json()
}
