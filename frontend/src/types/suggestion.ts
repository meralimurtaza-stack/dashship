export type SuggestionAction = 'rename' | 'change_type' | 'change_role'

export interface Suggestion {
  id: string
  action: SuggestionAction
  column: string
  fromValue: string
  toValue: string
  reason: string
}

export type SuggestionStatus = 'idle' | 'loading' | 'done' | 'error'
