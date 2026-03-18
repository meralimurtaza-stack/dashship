import { useState, useRef, useEffect, useCallback, type FC } from 'react'
import DashboardRenderer from '../components/dashboard/DashboardRenderer'
import ChatMessageComponent from '../components/chat/ChatMessage'
import ChatInput from '../components/chat/ChatInput'
import { useChatContext } from '../contexts/ChatContext'
import { useProject } from '../contexts/ProjectContext'
import type { GeneratedDashboard } from '../lib/generate-api'
import type { ColumnSchema } from '../types/datasource'
import type { CalculatedField } from '../engine/formulaParser'

// ── Props ────────────────────────────────────────────────────────

interface BuildPageProps {
  dashboard: GeneratedDashboard
  data: Record<string, unknown>[]
  columns: ColumnSchema[]
  calculatedFields?: CalculatedField[]
  onPublished?: () => void
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
  dashboard,
  data,
  calculatedFields,
  onPublished,
}) => {
  const {
    messages, isStreaming, sendMessage, stopStreaming,
  } = useChatContext()
  const { currentProject } = useProject()

  const [captainOpen, setCaptainOpen] = useState(true)
  const [dashboardName, setDashboardName] = useState(dashboard.name)
  const [isEditingName, setIsEditingName] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handlePublish = useCallback(() => {
    onPublished?.()
  }, [onPublished])

  return (
    <div className="h-full flex">
      {/* Dashboard Area */}
      <div className="flex-1 min-w-0 flex flex-col bg-ds-bg">
        {/* Header */}
        <div className="h-11 px-5 flex items-center justify-between border-b border-ds-border bg-ds-surface shrink-0">
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
            <span className="font-mono text-[10px] text-ds-text-dim tabular-nums">
              {dashboard.sheets.length} charts
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!captainOpen && (
              <button
                onClick={() => setCaptainOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-ds-text-muted border border-ds-border hover:border-ds-accent hover:text-ds-text transition-colors"
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
              className="flex items-center gap-2 px-5 py-1.5 font-mono text-[10px] uppercase tracking-wide bg-ds-accent text-white border border-ds-accent hover:bg-ds-accent-hover transition-colors"
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

        {/* Dashboard Canvas */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto">
            <DashboardRenderer
              layout={dashboard.layout}
              sheets={dashboard.sheets}
              data={data}
              calculatedFields={calculatedFields}
            />
          </div>
        </div>
      </div>

      {/* Captain Sidebar */}
      {captainOpen && (
        <div className="w-80 shrink-0 border-l border-ds-border bg-ds-surface flex flex-col">
          {/* Sidebar Header */}
          <div className="h-11 px-4 flex items-center justify-between border-b border-ds-border shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-ds-accent flex items-center justify-center">
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
              {messages.map((msg, i) => {
                const isLastAssistant = msg.role === 'assistant' && !isStreaming && i === messages.length - 1
                const isPlanPhase = msg.phase === 'plan'

                // Divider messages
                if (msg.role === 'system' && msg.metadata?.type === 'divider') {
                  return <PhaseDivider key={msg.id} label={msg.metadata.label} />
                }

                // Wrap plan-phase messages in opacity container, render smaller
                if (isPlanPhase) {
                  return (
                    <div key={msg.id} className="opacity-50 text-[11px]">
                      <ChatMessageComponent
                        message={msg}
                        isStreaming={isStreaming && i === messages.length - 1}
                      />
                    </div>
                  )
                }

                // Build-phase messages render normally
                return (
                  <ChatMessageComponent
                    key={msg.id}
                    message={msg}
                    isStreaming={isStreaming && i === messages.length - 1}
                    onCalcAction={isLastAssistant ? sendMessage : undefined}
                  />
                )
              })}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="shrink-0 px-3 py-3 border-t border-ds-border">
            <ChatInput
              onSend={sendMessage}
              disabled={false}
              isStreaming={isStreaming}
              onStop={stopStreaming}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default BuildPage
