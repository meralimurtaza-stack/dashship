import { createContext, useContext, type ReactNode } from 'react'
import { useChat } from '../hooks/useChat'
import type { ChatDataContext } from '../types/chat'

type ChatContextValue = ReturnType<typeof useChat>

const ChatContext = createContext<ChatContextValue | null>(null)

interface ChatProviderProps {
  dataContext: ChatDataContext | null
  dataSourceId: string | null
  onProjectNamed?: (name: string) => void
  children: ReactNode
}

export function ChatProvider({
  dataContext,
  dataSourceId,
  onProjectNamed,
  children,
}: ChatProviderProps) {
  const chat = useChat(dataContext, dataSourceId, onProjectNamed)
  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}
