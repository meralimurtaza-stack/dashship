import type { ChatDataContext, ChatMessage } from '../types/chat'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export async function streamChat(
  messages: ChatMessage[],
  dataContext: ChatDataContext,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      data_context: {
        source_name: dataContext.sourceName,
        row_count: dataContext.rowCount,
        columns: dataContext.columns.map((c) => ({
          name: c.name,
          display_name: c.displayName,
          type: c.type,
          role: c.role,
          sample_values: c.sampleValues,
        })),
      },
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
