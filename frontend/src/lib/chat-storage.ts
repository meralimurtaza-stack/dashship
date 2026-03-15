import { supabase } from './supabase'
import type { ChatMessage } from '../types/chat'

export async function loadMessages(dataSourceId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('data_source_id', dataSourceId)
    .order('created_at', { ascending: true })

  if (error) return []

  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    timestamp: new Date(row.created_at).getTime(),
  }))
}

export async function saveMessage(
  dataSourceId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ data_source_id: dataSourceId, role, content })
    .select()
    .single()

  if (error) return null

  return {
    id: data.id,
    role: data.role,
    content: data.content,
    timestamp: new Date(data.created_at).getTime(),
  }
}
