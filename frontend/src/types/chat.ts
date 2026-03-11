export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface DataContextColumn {
  name: string
  displayName: string | null
  type: string
  role: 'dimension' | 'measure'
  sampleValues: string[]
}

export interface ChatDataContext {
  sourceName: string
  sourceId: string
  rowCount: number
  columns: DataContextColumn[]
}
