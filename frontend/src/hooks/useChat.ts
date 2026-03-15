import { useState, useCallback, useRef, useEffect } from 'react'
import type { ChatMessage, ChatDataContext } from '../types/chat'
import type { PlanDelta, PlanSpec } from '../types/plan-spec'
import { streamChat } from '../lib/chat-api'
import { loadMessages, saveMessage } from '../lib/chat-storage'
import { parsePlanDeltas } from '../utils/plan-delta-parser'

export function useChat(
  dataContext: ChatDataContext | null,
  dataSourceId?: string | null,
  onProjectNamed?: (name: string) => void,
  planSpec?: PlanSpec | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastDeltas, setLastDeltas] = useState<PlanDelta[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const loadedSourceRef = useRef<string | null>(null)

  // Load persisted messages when dataSourceId becomes available
  useEffect(() => {
    if (!dataSourceId || loadedSourceRef.current === dataSourceId) return
    loadedSourceRef.current = dataSourceId
    loadMessages(dataSourceId).then((persisted) => {
      if (persisted.length > 0) setMessages(persisted)
    }).catch(() => { /* Supabase unavailable — start with empty */ })
  }, [dataSourceId])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return

      const isFirst = messages.length === 0

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
      setLastDeltas([])

      // Persist user message (fire-and-forget)
      if (dataSourceId) {
        saveMessage(dataSourceId, 'user', content.trim()).catch(() => {})
      }

      const controller = new AbortController()
      abortRef.current = controller

      const allMessages = [...messages, userMsg]
      let finalContent = ''

      try {
        await streamChat(
          allMessages,
          dataContext,
          planSpec ?? null,
          (chunk) => {
            finalContent += chunk
            setMessages((prev) => {
              const updated = [...prev]
              const last = updated[updated.length - 1]
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = {
                  ...last,
                  content: finalContent,
                }
              }
              return updated
            })
          },
          controller.signal,
          isFirst
        )

        // Parse plan deltas from response
        const { text: deltaCleanedContent, deltas } = parsePlanDeltas(finalContent)
        if (deltas.length > 0) {
          setLastDeltas(deltas)
        }

        // Parse and strip <project-name> tag from first response
        let cleanContent = deltaCleanedContent
        if (isFirst && onProjectNamed) {
          const nameMatch = cleanContent.match(/<project-name>(.*?)<\/project-name>/)
          if (nameMatch) {
            onProjectNamed(nameMatch[1].trim())
            cleanContent = cleanContent.replace(/<project-name>.*?<\/project-name>\s*/g, '').trim()
          }
        }

        // Update final message with cleaned content
        if (cleanContent !== finalContent) {
          setMessages((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: cleanContent }
            }
            return updated
          })
        }

        // Persist completed assistant message
        if (dataSourceId && cleanContent) {
          saveMessage(dataSourceId, 'assistant', cleanContent).catch(() => {})
        }
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
    [dataContext, dataSourceId, messages, isStreaming, onProjectNamed, planSpec]
  )

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  return { messages, setMessages, isStreaming, sendMessage, stopStreaming, clearMessages, lastDeltas }
}
