/**
 * components/chat/ChatMessage.tsx
 *
 * Restyled with landing page design system:
 * - Captain uses sailing icon in white circle with ring
 * - Glass-panel message bubbles for Captain
 * - Surface-container-low for user messages
 * - All logic (plan parsing, insights, wireframe) unchanged
 */

import { type FC, useEffect, useRef } from 'react';
import type { ChatMessage as ChatMessageType } from '../../types/chat';
import type { PlanDelta } from '../../utils/plan-parser';
import { parsePlanMessage } from '../../utils/plan-parser';
import { parseInsights, type InsightData } from '../../utils/insight-parser';
import Markdown from './Markdown';
import InsightCard from './InsightCard';
import WireframeWidget from './WireframeWidget';
import ChoiceCards, { parseChoices, hasChoiceQuestion } from './ChoiceCards';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  onCalcAction?: (action: string) => void;
  onPinInsight?: (insight: InsightData) => void;
  onPlanDelta?: (delta: PlanDelta) => void;
  suppressPlanDelta?: boolean;
  isLastAssistant?: boolean;
  onChoiceSelect?: (choice: string) => void;
}

// ── Assistant message content ───────────────────────────────────

const AssistantContent: FC<{
  content: string;
  onCalcAction?: (action: string) => void;
  onPinInsight?: (insight: InsightData) => void;
  onPlanDelta?: (delta: PlanDelta) => void;
  suppressPlanDelta?: boolean;
}> = ({ content, onCalcAction, onPinInsight, onPlanDelta, suppressPlanDelta }) => {
  const deltaEmitted = useRef(false);

  const { cleanText, planDelta } = parsePlanMessage(content);

  useEffect(() => {
    if (planDelta && onPlanDelta && !deltaEmitted.current) {
      deltaEmitted.current = true;
      onPlanDelta(planDelta);
    }
  }, [planDelta, onPlanDelta]);

  const { cleanText: finalText, insights } = parseInsights(cleanText);

  if (insights.length === 0) {
    return (
      <div className="space-y-2">
        <Markdown content={cleanText} onCalcAction={onCalcAction} />
        {planDelta && !suppressPlanDelta && <WireframeWidget plan={planDelta} />}
      </div>
    );
  }

  const parts = finalText.split(/(__INSIGHT_\d+__)/);
  return (
    <div className="space-y-3">
      {parts.map((part, i) => {
        const insightMatch = part.match(/^__INSIGHT_(\d+)__$/);
        if (insightMatch) {
          const idx = parseInt(insightMatch[1], 10);
          const insight = insights[idx];
          if (insight) {
            return (
              <InsightCard
                key={`insight-${i}`}
                insight={insight}
                onPin={onPinInsight ? () => onPinInsight(insight) : undefined}
              />
            );
          }
          return null;
        }
        const trimmed = part.trim();
        if (!trimmed) return null;
        return <Markdown key={`text-${i}`} content={trimmed} onCalcAction={onCalcAction} />;
      })}
      {planDelta && !suppressPlanDelta && <WireframeWidget plan={planDelta} />}
    </div>
  );
};

// ── Main ChatMessage component ──────────────────────────────────

const ChatMessage: FC<ChatMessageProps> = ({
  message, isStreaming, onCalcAction, onPinInsight, onPlanDelta, suppressPlanDelta,
  isLastAssistant, onChoiceSelect,
}) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex gap-4 justify-end items-start mb-6">
        <div
          className="max-w-xl rounded-[2rem] rounded-tr-none shadow-sm"
          style={{
            padding: '20px 24px',
            backgroundColor: 'var(--color-lp-surface-container-low)',
            border: '1px solid rgba(228,226,221,0.3)',
          }}
        >
          <p
            className="whitespace-pre-wrap leading-relaxed"
            style={{
              fontSize: '14px',
              color: 'var(--color-lp-on-surface-variant)',
            }}
          >
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-start mb-6">
      <div className="w-10 h-10 rounded-full bg-white shadow-xl ring-2 ring-lp-primary/20 flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-lp-primary text-xl">sailing</span>
      </div>
      <div className="max-w-2xl">
        <div
          className="glass-panel rounded-[2rem] rounded-tl-none shadow-sm ring-1 ring-lp-primary/5"
          style={{
            padding: '20px 24px',
            border: '1px solid rgba(255,255,255,0.4)',
          }}
        >
          <div
            style={{
              fontSize: '14px',
              lineHeight: '1.7',
            }}
          >
            {message.content ? (
              <>
                <AssistantContent
                  content={message.content}
                  onCalcAction={onCalcAction}
                  onPinInsight={onPinInsight}
                  onPlanDelta={onPlanDelta}
                  suppressPlanDelta={suppressPlanDelta}
                />
                {/* Choice cards */}
                {isLastAssistant && !isStreaming && onChoiceSelect && (() => {
                  const choices = hasChoiceQuestion(message.content) ? parseChoices(message.content) : null
                  return choices ? (
                    <ChoiceCards choices={choices} onSelect={onChoiceSelect} />
                  ) : null
                })()}
                {isStreaming && (
                  <div className="flex items-center gap-2 mt-4 animate-pulse">
                    <span className="material-symbols-outlined text-lp-primary text-sm">sailing</span>
                    <span
                      className="text-[10px] uppercase tracking-widest"
                      style={{
                        fontFamily: 'var(--font-label)',
                        color: 'var(--color-lp-on-surface-variant)',
                      }}
                    >
                      Charting the course...
                    </span>
                  </div>
                )}
              </>
            ) : isStreaming ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-lp-primary)' }} />
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-lp-primary)', opacity: 0.6, animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-lp-primary)', opacity: 0.3, animationDelay: '300ms' }} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
