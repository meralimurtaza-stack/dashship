import { type FC } from 'react'
import type { ChatMessage as ChatMessageType } from '../../types/chat'
import Markdown from './Markdown'
import InsightCard from './InsightCard'
import { parseInsights, type InsightData } from '../../utils/insight-parser'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
  onCalcAction?: (action: string) => void
  onPinInsight?: (insight: InsightData) => void
}

const CaptainWheel: FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-ds-text-dim">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
    <line x1="12" y1="2" x2="12" y2="8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    <line x1="12" y1="16" x2="12" y2="22" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    <line x1="2" y1="12" x2="8" y2="12" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    <line x1="16" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    <line x1="4.93" y1="4.93" x2="8.88" y2="8.88" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    <line x1="15.12" y1="15.12" x2="19.07" y2="19.07" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    <line x1="4.93" y1="19.07" x2="8.88" y2="15.12" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    <line x1="15.12" y1="8.88" x2="19.07" y2="4.93" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
  </svg>
)

const AssistantContent: FC<{
  content: string
  onCalcAction?: (action: string) => void
  onPinInsight?: (insight: InsightData) => void
}> = ({ content, onCalcAction, onPinInsight }) => {
  const { cleanText, insights } = parseInsights(content)

  if (insights.length === 0) {
    return <Markdown content={content} onCalcAction={onCalcAction} />
  }

  // Split content on __INSIGHT_N__ placeholders and interleave InsightCards
  const parts = cleanText.split(/(__INSIGHT_\d+__)/)
  return (
    <div className="space-y-3">
      {parts.map((part, i) => {
        const insightMatch = part.match(/^__INSIGHT_(\d+)__$/)
        if (insightMatch) {
          const idx = parseInt(insightMatch[1], 10)
          const insight = insights[idx]
          if (insight) {
            return (
              <InsightCard
                key={`insight-${i}`}
                insight={insight}
                onPin={onPinInsight ? () => onPinInsight(insight) : undefined}
              />
            )
          }
          return null
        }
        const trimmed = part.trim()
        if (!trimmed) return null
        return <Markdown key={`text-${i}`} content={trimmed} onCalcAction={onCalcAction} />
      })}
    </div>
  )
}

const ChatMessage: FC<ChatMessageProps> = ({ message, isStreaming, onCalcAction, onPinInsight }) => {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-ds-accent text-white px-4 py-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        <div className="flex items-center gap-2 mb-2">
          <CaptainWheel />
          <span className="micro-label">
            Captain
          </span>
        </div>
        {message.content ? (
          <AssistantContent content={message.content} onCalcAction={onCalcAction} onPinInsight={onPinInsight} />
        ) : isStreaming ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-ds-text-dim animate-pulse" />
              <div className="w-1.5 h-1.5 bg-ds-border-strong animate-pulse [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 bg-ds-border animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ChatMessage
