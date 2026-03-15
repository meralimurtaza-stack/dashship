export interface InsightKpiItem {
  label: string
  value: string
  delta?: string
  deltaDir?: 'up' | 'down'
}

export interface InsightBarItem {
  label: string
  value: number
}

export interface InsightData {
  type: 'kpi' | 'bar' | 'line'
  title?: string
  data: InsightKpiItem[] | InsightBarItem[]
}

function parseAttr(attrs: string, name: string): string | undefined {
  // Match name='value' or name="value"
  const match = attrs.match(new RegExp(`${name}\\s*=\\s*'([^']*)'`))
    || attrs.match(new RegExp(`${name}\\s*=\\s*"([^"]*)"`))
  return match ? match[1] : undefined
}

export function parseInsights(text: string): { cleanText: string; insights: InsightData[] } {
  const insights: InsightData[] = []
  const cleanText = text.replace(/<insight\s+([^>]+)\/>/g, (_, attrs: string) => {
    try {
      const type = parseAttr(attrs, 'type') as InsightData['type'] | undefined
      const dataStr = parseAttr(attrs, 'data')
      const title = parseAttr(attrs, 'title')

      if (type && dataStr) {
        const data = JSON.parse(dataStr)
        insights.push({ type, title, data })
        return `__INSIGHT_${insights.length - 1}__`
      }
    } catch (e) {
      console.error('Failed to parse insight:', e)
    }
    return ''
  })
  return { cleanText, insights }
}
