import { createContext, useContext, useState, useMemo, type ReactNode } from 'react'
import { useChat } from '../hooks/useChat'
import type { ChatDataContext } from '../types/chat'
import type { PlanSpec } from '../types/plan-spec'

type ChatContextValue = ReturnType<typeof useChat> & {
  dataContext: ChatDataContext | null
  setDataContext: (ctx: ChatDataContext | null) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

interface ChatProviderProps {
  dataContext: ChatDataContext | null
  dataSourceId: string | null
  onProjectNamed?: (name: string) => void
  planSpec?: PlanSpec | null
  children: ReactNode
}

export function ChatProvider({
  dataContext: externalDataContext,
  dataSourceId: externalDataSourceId,
  onProjectNamed,
  planSpec,
  children,
}: ChatProviderProps) {
  // Local override: ChatPage can set this when user loads data locally
  const [localDataContext, setLocalDataContext] = useState<ChatDataContext | null>(null)

  // Local context wins over project-level context
  const effectiveDataContext = localDataContext ?? externalDataContext
  const effectiveDataSourceId = localDataContext?.sourceId ?? externalDataSourceId

  const chat = useChat(effectiveDataContext, effectiveDataSourceId, onProjectNamed, planSpec)

  const value = useMemo(() => ({
    ...chat,
    dataContext: effectiveDataContext,
    setDataContext: setLocalDataContext,
  }), [chat, effectiveDataContext])

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChatContext must be used within ChatProvider')
  return ctx
}
