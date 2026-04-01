export interface DictionaryEntry {
  id: string
  projectId: string
  name: string
  formula: string | null
  description: string | null
  source: 'ai' | 'user'
  createdAt: string
}
