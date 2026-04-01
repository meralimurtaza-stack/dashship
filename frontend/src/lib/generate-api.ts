import type { ChatDataContext } from '../types/chat'
import type { Sheet, DashboardLayout } from '../types/sheet'
import type { CalculatedField } from '../engine/formulaParser'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Legacy types (kept for backward compat) ─────────────────────

export interface GeneratedDashboard {
  name: string
  sheets: Sheet[]
  layout: DashboardLayout
  calculatedFields?: CalculatedField[]
}

export interface GenerateResponse {
  dashboard: GeneratedDashboard
  warnings: string[]
}

// ── New JSX generation types ────────────────────────────────────

export interface GenerateJsxResponse {
  jsxCode: string
  warnings: string[]
  renameMap?: Record<string, string>
}

// ── Field name remapping ─────────────────────────────────────────
// The CSV has raw column names (e.g. "trial_feature_y") but users rename
// them to display names (e.g. "Trial Feature Y"). Captain uses display names
// in the plan. The generated JSX must use display names too, so data rows
// need to be remapped to match.

function buildRenameMap(dataContext: ChatDataContext): Record<string, string> {
  const map: Record<string, string> = {}
  for (const c of dataContext.columns) {
    if (c.displayName && c.displayName !== c.name) {
      map[c.name] = c.displayName
    }
  }
  return map
}

function remapRows(
  rows: Record<string, unknown>[],
  renameMap: Record<string, string>
): Record<string, unknown>[] {
  if (Object.keys(renameMap).length === 0) return rows
  return rows.map((row) => {
    const newRow: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      newRow[renameMap[key] ?? key] = value
    }
    return newRow
  })
}

// ── New JSX generation function ─────────────────────────────────

export async function generateDashboardJsx(
  dataContext: ChatDataContext,
  conversationSummary: string,
  calculatedFields?: CalculatedField[],
  sampleRows?: Record<string, unknown>[],
  planDelta?: Record<string, unknown> | null
): Promise<GenerateJsxResponse> {
  const renameMap = buildRenameMap(dataContext)
  const remappedSamples = sampleRows ? remapRows(sampleRows, renameMap) : []
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
          stats: c.stats ? {
            min: c.stats.min,
            max: c.stats.max,
            mean: c.stats.mean,
            median: c.stats.median,
            unique_count: c.stats.uniqueCount,
            null_count: c.stats.nullCount,
            top_values: c.stats.topValues ?? [],
            earliest: c.stats.earliest,
            latest: c.stats.latest,
            granularity: c.stats.granularity,
          } : null,
        })),
        sample_rows: remappedSamples.slice(0, 8),
      },
      conversation_summary: conversationSummary,
      calculated_fields: calculatedFields?.map((cf) => ({
        name: cf.name,
        formula: cf.formula,
      })) ?? [],
      plan_delta: planDelta ?? null,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Generation failed' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  const data = await res.json()

  return {
    jsxCode: data.jsx_code,
    warnings: data.warnings ?? [],
    renameMap, // expose so caller can remap full data rows
  }
}

// ── Edit existing dashboard ──────────────────────────────────────

export async function editDashboardJsx(
  currentJsx: string,
  editRequest: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<GenerateJsxResponse> {
  const res = await fetch(`${API_BASE}/api/generate/edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      current_jsx: currentJsx,
      edit_request: editRequest,
      conversation_history: conversationHistory ?? [],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Edit failed' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  const data = await res.json()
  return {
    jsxCode: data.jsx_code,
    warnings: data.warnings ?? [],
  }
}

// ── Streaming generation with progress ───────────────────────────

export interface StreamCallbacks {
  onProgress: (message: string) => void
  onComplete: (jsxCode: string, warnings: string[]) => void
  onError: (error: string) => void
}

export async function generateDashboardJsxStream(
  dataContext: ChatDataContext,
  conversationSummary: string,
  callbacks: StreamCallbacks,
  calculatedFields?: CalculatedField[],
  sampleRows?: Record<string, unknown>[],
  planDelta?: Record<string, unknown> | null
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/generate/stream`, {
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
          stats: c.stats
            ? {
                min: c.stats.min,
                max: c.stats.max,
                mean: c.stats.mean,
                median: c.stats.median,
                unique_count: c.stats.uniqueCount,
                null_count: c.stats.nullCount,
                top_values: c.stats.topValues ?? [],
                earliest: c.stats.earliest,
                latest: c.stats.latest,
                granularity: c.stats.granularity,
              }
            : null,
        })),
        sample_rows: sampleRows?.slice(0, 8) ?? [],
      },
      conversation_summary: conversationSummary,
      calculated_fields:
        calculatedFields?.map((cf) => ({
          name: cf.name,
          formula: cf.formula,
        })) ?? [],
      plan_delta: planDelta ?? null,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Generation failed' }))
    callbacks.onError(err.detail || `HTTP ${res.status}`)
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    callbacks.onError('No response body')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Parse SSE events from buffer
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? '' // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const event = JSON.parse(line.slice(6))
        if (event.type === 'progress') {
          callbacks.onProgress(event.message)
        } else if (event.type === 'complete') {
          callbacks.onComplete(event.jsx_code, event.warnings ?? [])
        } else if (event.type === 'error') {
          callbacks.onError(event.detail)
        }
      } catch {
        // Skip malformed SSE lines
      }
    }
  }
}

// ── Legacy function (kept for backward compat) ──────────────────

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
