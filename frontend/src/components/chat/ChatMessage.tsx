/**
 * components/chat/ChatMessage.tsx
 *
 * Updated styling to match prototype:
 * - Captain uses HelmLogo in accent-light circle
 * - User messages: dark bubble with rounded corners (sharp bottom-right)
 * - Captain text: left-aligned, indented to align with label text
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
import { HelmLogo } from '../icons';

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  onCalcAction?: (action: string) => void;
  onPinInsight?: (insight: InsightData) => void;
  onPlanDelta?: (delta: PlanDelta) => void;
  /** When true, hide WireframeWidget (plan preview cards) — used in BUILD mode */
  suppressPlanDelta?: boolean;
  /** Whether this is the last assistant message (for showing choice cards) */
  isLastAssistant?: boolean;
  /** Callback when user clicks a choice card */
  onChoiceSelect?: (choice: string) => void;
}

// ── Captain identity label ──────────────────────────────────────

const CaptainLabel: FC = () => (
  <div className="flex items-center gap-1.5 mb-2">
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: '20px',
        height: '20px',
        borderRadius: '9999px',
        background: 'var(--color-ds-accent-light)',
      }}
    >
      <HelmLogo size={11} className="text-ds-accent" />
    </div>
    <span
      className="text-ds-text-muted"
      style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.03em',
      }}
    >
      Captain
    </span>
  </div>
);

// ── Assistant message content ───────────────────────────────────

const AssistantContent: FC<{
  content: string;
  onCalcAction?: (action: string) => void;
  onPinInsight?: (insight: InsightData) => void;
  onPlanDelta?: (delta: PlanDelta) => void;
  suppressPlanDelta?: boolean;
}> = ({ content, onCalcAction, onPinInsight, onPlanDelta, suppressPlanDelta }) => {
  const deltaEmitted = useRef(false);

  // Parse plan delta from the message
  const { cleanText, planDelta } = parsePlanMessage(content);

  // Notify parent of plan delta (once per message)
  useEffect(() => {
    if (planDelta && onPlanDelta && !deltaEmitted.current) {
      deltaEmitted.current = true;
      onPlanDelta(planDelta);
    }
  }, [planDelta, onPlanDelta]);

  // Parse insights from the clean text (after plan tags stripped)
  const { cleanText: finalText, insights } = parseInsights(cleanText);

  // No insights — simple render with optional wireframe
  if (insights.length === 0) {
    return (
      <div className="space-y-2">
        <Markdown content={cleanText} onCalcAction={onCalcAction} />
        {planDelta && !suppressPlanDelta && <WireframeWidget plan={planDelta} />}
      </div>
    );
  }

  // Has insights — interleave text, insights, and wireframe
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
      <div className="flex justify-end mb-5">
        <div
          className="max-w-[78%] bg-ds-text text-ds-bg"
          style={{
            padding: '11px 16px',
            borderRadius: '16px 16px 4px 16px',
          }}
        >
          <p
            className="whitespace-pre-wrap"
            style={{
              fontSize: '13px',
              lineHeight: '1.6',
            }}
          >
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6">
      <div className="max-w-[90%]">
        <CaptainLabel />
        <div
          style={{
            paddingLeft: '26px',
            fontSize: '13px',
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
              {/* Choice cards — shown on last assistant message when not streaming */}
              {isLastAssistant && !isStreaming && onChoiceSelect && (() => {
                const choices = hasChoiceQuestion(message.content) ? parseChoices(message.content) : null
                return choices ? (
                  <ChoiceCards choices={choices} onSelect={onChoiceSelect} />
                ) : null
              })()}
              {isStreaming && (
                <div className="flex items-center gap-2 mt-3 animate-pulse">
                  <HelmLogo size={10} className="text-ds-text-dim" />
                  <span
                    className="text-ds-text-dim"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Charting the course…
                  </span>
                </div>
              )}
            </>
          ) : isStreaming ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div
                  className="animate-pulse"
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '9999px',
                    background: 'var(--color-ds-text-dim)',
                  }}
                />
                <div
                  className="animate-pulse"
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '9999px',
                    background: 'var(--color-ds-border-strong)',
                    animationDelay: '150ms',
                  }}
                />
                <div
                  className="animate-pulse"
                  style={{
                    width: '5px',
                    height: '5px',
                    borderRadius: '9999px',
                    background: 'var(--color-ds-border)',
                    animationDelay: '300ms',
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
