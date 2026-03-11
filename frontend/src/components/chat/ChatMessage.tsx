import { type FC } from 'react'
import type { ChatMessage as ChatMessageType } from '../../types/chat'
import Markdown from './Markdown'

interface ChatMessageProps {
  message: ChatMessageType
  isStreaming?: boolean
  onCalcAction?: (action: string) => void
}

const CaptainWheel: FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gray-400">
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

const ChatMessage: FC<ChatMessageProps> = ({ message, isStreaming, onCalcAction }) => {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-gray-900 text-white px-4 py-3">
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
          <span className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
            Captain
          </span>
        </div>
        {message.content ? (
          <Markdown content={message.content} onCalcAction={onCalcAction} />
        ) : isStreaming ? (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 animate-pulse" />
              <div className="w-1.5 h-1.5 bg-gray-300 animate-pulse [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 bg-gray-200 animate-pulse [animation-delay:300ms]" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ChatMessage
