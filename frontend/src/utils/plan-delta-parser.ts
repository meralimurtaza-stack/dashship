import type { PlanDelta } from '../types/plan-spec'

export function parsePlanDeltas(response: string): { text: string; deltas: PlanDelta[] } {
  const deltas: PlanDelta[] = []
  const text = response.replace(/<plan_delta>([\s\S]*?)<\/plan_delta>/g, (_, json) => {
    try {
      const parsed = JSON.parse(json.trim())
      deltas.push(parsed)
    } catch (e) {
      console.error('Failed to parse plan delta:', e)
    }
    return ''
  }).trim()
  return { text, deltas }
}
