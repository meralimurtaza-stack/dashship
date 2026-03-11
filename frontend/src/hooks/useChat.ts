import { useState, useCallback, useRef } from 'react'
import type { ChatMessage, ChatDataContext } from '../types/chat'
import { streamChat } from '../lib/chat-api'

export function useChat(dataContext: ChatDataContext | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (content: string) => {
      if (!dataContext || !content.trim() || isStreaming) return

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setIsStreaming(true)

      const controller = new AbortController()
      abortRef.current = controller

      const allMessages = [...messages, userMsg]

      try {
        await streamChat(
          allMessages,
          dataContext,
          (chunk) => {
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + chunk,
                }
              }
              return updated
            })
          },
          controller.signal
        )
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content:
                  last.content || `Error: ${(err as Error).message}`,
              }
            }
            return updated
          })
        }
      } finally {
        setIsStreaming(false)
        abortRef.current = null
      }
    },
    [dataContext, messages, isStreaming]
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, isStreaming, sendMessage, stopStreaming, clearMessages }
}
