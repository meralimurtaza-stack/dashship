import type { ChatDataContext, ChatMessage } from '../types/chat'
import type { PlanSpec } from '../types/plan-spec'
import type { DictionaryEntry } from '../types/data-dictionary'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function streamChat(
  messages: ChatMessage[],
  dataContext: ChatDataContext | null,
  planSpec: PlanSpec | null,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  isFirstMessage?: boolean,
  phase?: string,
  dictionaryEntries?: DictionaryEntry[]
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      data_context: dataContext
        ? {
            source_name: dataContext.sourceName,
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
          }
        : null,
      is_first_message: isFirstMessage ?? false,
      plan_spec: planSpec ?? null,
      phase: phase ?? 'plan',
      dictionary_entries: dictionaryEntries?.map((e) => ({
        name: e.name,
        formula: e.formula,
        description: e.description,
        source: e.source,
      })) ?? null,
    }),
    signal,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(decoder.decode(value, { stream: true }))
  }
}
