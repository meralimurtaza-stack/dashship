import { useState, useRef, useEffect, useCallback, type FC } from 'react'
import DashboardIframe from '../components/dashboard/DashboardIframe'
import ChatMessageComponent from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import PublishModal from '../components/publish/PublishModal'
import DataDictionaryPanel from '../components/data/DataDictionaryPanel'
import { useChatContext } from '../contexts/ChatContext'
import { useProject } from '../contexts/ProjectContext'

// ── Props ────────────────────────────────────────────────────────

interface BuildPageProps {
  jsxCode: string
  data: Record<string, unknown>[]
  dashboardName: string
  dashboardId?: string
  projectId?: string
  onPublished?: () => void
  onRegenerate?: (buildMessages?: Array<{ role: string; content: string }>) => void
  isRegenerating?: boolean
  onUndo?: () => void
}

// ── Divider ──────────────────────────────────────────────────────

const PhaseDivider: FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-3 py-3">
    <div className="flex-1 h-px bg-ds-border" />
    <span className="font-mono text-[9px] uppercase tracking-widest text-ds-text-dim">
      {label}
    </span>
    <div className="flex-1 h-px bg-ds-border" />
  </div>
)

// ── Main BuildPage ───────────────────────────────────────────────

const BuildPage: FC<BuildPageProps> = ({
  jsxCode,
  data,
  dashboardName: initialName,
  dashboardId,
  projectId,
  onPublished,
  onRegenerate,
  isRegenerating = false,
  onUndo,
}) => {
  const {
    messages, isStreaming, sendMessage, stopStreaming,
  } = useChatContext()
  const { currentProject } = useProject()

  const [captainOpen, setCaptainOpen] = useState(true)
  const [dictionaryOpen, setDictionaryOpen] = useState(false)
  const [dashboardName, setDashboardName] = useState(initialName)
  const [isEditingName, setIsEditingName] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevStreamingRef = useRef(isStreaming)
  const userSentMessageRef = useRef(false)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Track when Captain finishes responding to a user change request
  // so we can show the "Update Dashboard" button
  const [_showUpdateButton, _setShowUpdateButton] = useState(false) // Kept for compat, auto-apply replaces this

  useEffect(() => {
    const wasStreaming = prevStreamingRef.current
    prevStreamingRef.current = isStreaming

    // Auto-apply: when Captain finishes responding, check if it's an edit action
    if (wasStreaming && !isStreaming && userSentMessageRef.current && onRegenerate) {
      userSentMessageRef.current = false

      // Check last assistant message for <action>edit</action>
      const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
      if (lastAssistant?.content?.includes('<action>edit</action>')) {
        const buildMessages = messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .filter(m => m.phase !== 'plan' && !(m.role === 'system'))
          .map(m => ({ role: m.role, content: m.content.replace(/<action>[\s\S]*?<\/action>/g, '').trim() }))
        onRegenerate(buildMessages)
      }
      // If <action>none</action> or no tag — just a question/suggestion, no edit triggered
    }
  }, [isStreaming, onRegenerate, messages])

  // Wrap sendMessage to track user-initiated messages
  const handleSendMessage = useCallback((content: string) => {
    userSentMessageRef.current = true
    sendMessage(content)
  }, [sendMessage])

  const handlePublish = useCallback(() => {
    setShowPublishModal(true)
  }, [])

  const handlePublished = useCallback((_slug: string) => {
    // Don't close the modal — let user copy the URL first.
    onPublished?.()
  }, [onPublished])

  return (
    <div className="h-full flex">
      {/* Dashboard Area */}
      <div className="flex-1 min-w-0 flex flex-col bg-ds-bg">
        {/* Header */}
        <div className="h-11 px-5 flex items-center justify-between bg-ds-surface shrink-0" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-3">
            {isEditingName ? (
              <input
                value={dashboardName}
                onChange={(e) => setDashboardName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                className="font-mono text-sm font-medium text-ds-text bg-transparent border-b border-ds-border-strong focus:border-ds-accent outline-none"
                autoFocus
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="font-mono text-sm font-medium text-ds-text hover:opacity-60 transition-opacity"
              >
                {dashboardName}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onRegenerate && (
              <button
                onClick={() => onRegenerate()}
                disabled={isRegenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-ds-text-muted hover:text-ds-text transition-colors disabled:opacity-40"
                style={{ border: '0.5px solid var(--color-ds-border)' }}
              >
                <svg className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
                {isRegenerating ? 'Regenerating…' : 'Regenerate'}
              </button>
            )}
            {currentProject?.id && (
              <button
                onClick={() => setDictionaryOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-ds-text-muted hover:text-ds-text transition-colors"
                style={{ border: '0.5px solid var(--color-ds-border)' }}
              >
                Dictionary
              </button>
            )}
            {!captainOpen && (
              <button
                onClick={() => setCaptainOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-ds-text-muted hover:border-ds-accent hover:text-ds-text transition-colors"
                style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 8 }}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0-2.83-2.83M9.76 9.76 6.93 6.93" />
                </svg>
                Captain
              </button>
            )}
            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-5 py-1.5 font-mono text-[10px] uppercase tracking-wide bg-ds-accent text-white hover:bg-ds-accent-hover transition-colors"
              style={{ border: '0.5px solid var(--color-ds-accent)', borderRadius: 10 }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
              </svg>
              Publish
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dashboard Canvas — iframe */}
        <div className="flex-1 overflow-auto">
          <DashboardIframe jsxCode={jsxCode} data={data} />
        </div>
      </div>

      {/* Captain Sidebar */}
      {captainOpen && (
        <div className="w-80 shrink-0 bg-ds-surface flex flex-col" style={{ borderLeft: '0.5px solid rgba(0,0,0,0.06)' }}>
          {/* Sidebar Header */}
          <div className="h-11 px-4 flex items-center justify-between shrink-0" style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-ds-accent flex items-center justify-center" style={{ borderRadius: '9999px' }}>
                <span className="text-white text-[10px] font-mono font-medium">C</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-ds-text-dim">
                Captain
              </span>
            </div>
            <button
              onClick={() => setCaptainOpen(false)}
              className="p-1 text-ds-text-dim hover:text-ds-text transition-colors"
              aria-label="Close Captain"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <p className="font-mono text-xs text-ds-text-dim">No messages yet</p>
                <p className="font-sans text-[11px] text-ds-text-muted leading-relaxed">
                  Ask Captain to modify charts, add filters, or change the layout.
                </p>
              </div>
            )}
            <div className="space-y-4">
              {messages
                .filter(msg => msg.phase !== 'plan' && !(msg.role === 'system' && msg.metadata?.type === 'divider'))
                .map((msg, i, filtered) => {
                const isLast = i === filtered.length - 1
                const isLastAssistantMsg = msg.role === 'assistant' && !isStreaming && isLast

                // Strip <action> tags from build messages before display
                const displayMsg = msg.role === 'assistant' && msg.content?.includes('<action>')
                  ? { ...msg, content: msg.content.replace(/<action>[\s\S]*?<\/action>/g, '').trim() }
                  : msg

                return (
                  <ChatMessageComponent
                    key={msg.id}
                    message={displayMsg}
                    isStreaming={isStreaming && isLast}
                    suppressPlanDelta
                    isLastAssistant={isLastAssistantMsg}
                    onChoiceSelect={isLastAssistantMsg ? handleSendMessage : undefined}
                  />
                )
              })}
            </div>
            {isRegenerating && (
              <div className="py-3 text-center">
                <span className="font-mono text-[10px] uppercase tracking-widest text-ds-text-dim animate-pulse">
                  Regenerating dashboard…
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Undo Button */}
          {onUndo && !isRegenerating && (
            <div className="shrink-0 px-3 pt-3" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
              <button
                onClick={onUndo}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-ds-text-muted hover:text-ds-text transition-colors"
                style={{ border: '0.5px solid var(--color-ds-border)', borderRadius: 10 }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                </svg>
                Undo last change
              </button>
            </div>
          )}

          {/* Chat Input */}
          <div className="shrink-0 px-3 py-3" style={{ borderTop: '0.5px solid rgba(0,0,0,0.06)' }}>
            <ChatInput
              onSend={handleSendMessage}
              disabled={false}
              isStreaming={isStreaming}
              onStop={stopStreaming}
            />
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <PublishModal
          dashboardId={dashboardId}
          projectId={projectId || currentProject?.id}
          dashboardName={dashboardName}
          jsxCode={jsxCode}
          data={data}
          onClose={() => setShowPublishModal(false)}
          onPublished={handlePublished}
        />
      )}

      {/* Data Dictionary Panel */}
      {(projectId || currentProject?.id) && (
        <DataDictionaryPanel
          projectId={(projectId || currentProject?.id)!}
          isOpen={dictionaryOpen}
          onClose={() => setDictionaryOpen(false)}
        />
      )}
    </div>
  )
}

export default BuildPage
