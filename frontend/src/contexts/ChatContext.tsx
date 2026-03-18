/**
 * ChatContext.tsx
 *
 * Manages all chat state for the current project and phase.
 * Replaces both the old ChatContext.tsx and useChat.ts.
 *
 * Architecture:
 * - Reads currentProject from ProjectContext (no prop-drilling)
 * - Takes activePhase as a prop (set by AppLayout based on current tab)
 * - Loads/creates the right conversation when project or phase changes
 * - Handles message streaming via the existing chat-api
 * - Manages the PLAN → BUILD phase transition with divider messages
 *
 * Key behaviour:
 * - DATA tab has its own conversation (data engineer persona)
 * - PLAN and BUILD share one continuous conversation
 * - Conversations are created lazily on first message send
 * - Messages are persisted to Supabase as they're sent/received
 *
 * Spec references: §4.3 (continuous conversation), §5 (Captain prompts),
 * §10 (state management rules)
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import { useProject } from './ProjectContext';
import {
  createConversation,
  loadConversation,
  loadMessages as loadMessagesFromDb,
  saveMessage as saveMessageToDb,
  updateConversationPhase,
  linkDashboardToConversation,
  savePlanningUnderstanding,
} from '../lib/chat-storage';
import { streamChat } from '../lib/chat-api';
import { parsePlanDeltas } from '../utils/plan-delta-parser';
import type {
  Conversation,
  ConversationPhase,
  ChatMessage,
  ChatDataContext,
  MessageMetadata,
} from '../types/chat';

// ─── Context type ─────────────────────────────────────────────────

interface ChatContextType {
  /** The current conversation record. null if user hasn't started chatting. */
  conversation: Conversation | null;
  /** Messages for the current conversation, in chronological order. */
  messages: ChatMessage[];
  /** The active phase — determines Captain's persona. */
  activePhase: ConversationPhase;
  /** True while Captain is streaming a response. */
  isStreaming: boolean;
  /** True while loading conversation/messages from Supabase. */
  loading: boolean;

  /**
   * Send a user message. Handles the full flow:
   * 1. Creates conversation if needed
   * 2. Saves user message to Supabase
   * 3. Streams Captain's response
   * 4. Saves Captain's response to Supabase
   */
  sendMessage: (content: string, metadata?: MessageMetadata | null, dataContextOverride?: ChatDataContext | null) => Promise<void>;
  /** Abort the current streaming response. */
  stopStreaming: () => void;

  /**
   * Transition from PLAN to BUILD phase.
   * Inserts a "Dashboard generated" divider, updates conversation phase,
   * and links the dashboard to the conversation.
   */
  transitionToBuild: (dashboardId: string) => Promise<void>;

  /**
   * Save PlanningUnderstanding to the conversation.
   * Called when user clicks "Generate Dashboard".
   */
  savePlanUnderstanding: (understanding: Record<string, unknown>) => Promise<void>;

  /** Reset conversation state (used when switching projects). */
  clearChat: () => void;

  /**
   * Data context — the schema info Captain needs to give good advice.
   * Set by the DATA page when data is parsed, read by PLAN and BUILD.
   */
  dataContext: ChatDataContext | null;
  setDataContext: (ctx: ChatDataContext | null) => void;
}

// ─── Context ──────────────────────────────────────────────────────

const ChatContext = createContext<ChatContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────

interface ChatProviderProps {
  /**
   * The active tab/phase. ChatContext uses this to:
   * - Load the right conversation (data vs plan/build)
   * - Tag new messages with the correct phase
   * - Send the right context to Captain
   *
   * Set by AppLayout based on the current tab.
   */
  activePhase: ConversationPhase;
  children: ReactNode;
}

export function ChatProvider({ activePhase, children }: ChatProviderProps) {
  const { currentProject, updateProject } = useProject();

  // ── Core state ────────────────────────────────────────────────
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataContext, setDataContext] = useState<ChatDataContext | null>(null);

  // ── Refs for stable callbacks ─────────────────────────────────
  // These refs let sendMessage always read the latest values
  // without being in the useCallback dependency array.
  // Without this, sendMessage would re-create on every message change,
  // which causes subtle bugs with stale closures during streaming.
  const abortRef = useRef<AbortController | null>(null);
  const conversationRef = useRef<Conversation | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const dataContextRef = useRef<ChatDataContext | null>(null);

  conversationRef.current = conversation;
  messagesRef.current = messages;
  dataContextRef.current = dataContext;

  // ── Load conversation when project or phase changes ───────────
  // This is the key orchestration: when the user navigates to a
  // different tab or switches projects, we load the appropriate
  // conversation and its messages.
  //
  // If no conversation exists yet, that's fine — conversation stays
  // null and messages stays empty. The conversation gets created
  // lazily when the user sends their first message.

  useEffect(() => {
    // Reset state when project changes
    setConversation(null);
    setMessages([]);
    setIsStreaming(false);
    setDataContext(null);

    const projectId = currentProject?.id;
    if (!projectId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const conv = await loadConversation(projectId!, activePhase);

        if (cancelled) return;

        if (conv) {
          setConversation(conv);
          const msgs = await loadMessagesFromDb(conv.id);
          if (!cancelled) {
            setMessages(msgs);
          }
        }
        // If no conversation found, that's fine — state stays null/empty
      } catch (err) {
        console.error('Failed to load conversation:', err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [currentProject?.id, activePhase]);

  // ── Ensure conversation exists ────────────────────────────────
  // Creates a conversation if one doesn't exist yet.
  // Called internally before saving the first message.
  // Returns the conversation (existing or newly created).

  const ensureConversation = useCallback(async (): Promise<Conversation> => {
    const existing = conversationRef.current;
    if (existing) return existing;

    const projectId = currentProject?.id;
    if (!projectId) {
      throw new Error('Cannot create conversation without a project');
    }

    // For PLAN and BUILD, we always create as 'plan' — it transitions
    // to 'build' later via transitionToBuild()
    const createPhase = activePhase === 'build' ? 'plan' : activePhase;

    const conv = await createConversation(projectId, createPhase);
    setConversation(conv);
    conversationRef.current = conv;
    return conv;
  }, [currentProject?.id, activePhase]);

  // ── Send message ──────────────────────────────────────────────
  // The main action. Handles the full user → Captain round trip.
  //
  // Flow:
  // 1. Ensure conversation exists (lazy creation)
  // 2. Create local user message + empty assistant placeholder
  // 3. Save user message to Supabase (fire-and-forget)
  // 4. Call streamChat with full message history
  // 5. Stream chunks into the assistant placeholder
  // 6. When done, save assistant message to Supabase

  const sendMessage = useCallback(
    async (content: string, metadata: MessageMetadata | null = null, dataContextOverride?: ChatDataContext | null) => {
      if (!content.trim() || isStreaming) return;

      const conv = await ensureConversation();
      const now = new Date().toISOString();

      // ── Create local messages ───────────────────────────────
      // These go into React state immediately for instant UI update.
      // We use crypto.randomUUID() as temporary IDs — the real IDs
      // come back from Supabase, but the UI doesn't need them yet.

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        conversation_id: conv.id,
        role: 'user',
        content: content.trim(),
        phase: activePhase,
        metadata,
        created_at: now,
      };

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        conversation_id: conv.id,
        role: 'assistant',
        content: '',
        phase: activePhase,
        metadata: null,
        created_at: now,
      };

      setMessages(prev => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      // ── Persist user message (fire-and-forget) ──────────────
      // We don't await this — the UI shouldn't wait for the DB write.
      // If it fails, the message is still in local state for the
      // current session. We log the error but don't crash.
      saveMessageToDb(conv.id, 'user', content.trim(), activePhase, metadata)
        .catch(err => console.error('Failed to persist user message:', err));

      // ── Stream Captain's response ───────────────────────────
      const controller = new AbortController();
      abortRef.current = controller;

      // Build the message history for the API.
      // Filter out system messages (dividers) — Claude doesn't need them.
      // Only send user and assistant messages.
      const currentMessages = messagesRef.current;
      const historyForApi = [...currentMessages, userMsg]
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at).getTime(),
        }));

      let finalContent = '';

      try {
        await streamChat(
          historyForApi,
          dataContextOverride ?? dataContextRef.current,
          null, // planSpec — we'll pass this when needed
          (chunk) => {
            finalContent += chunk;
            // Strip tags in real-time so they never flash in the UI
            const displayContent = finalContent
              .replace(/<plan_delta>[\s\S]*?<\/plan_delta>/g, '')
              .replace(/<project-name>[\s\S]*?<\/project-name>/g, '')
              .trim();
            // Update the assistant placeholder with cleaned content
            setMessages(prev => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: displayContent };
              }
              return updated;
            });
          },
          controller.signal,
          currentMessages.length === 0 // isFirstMessage
        );

        // ── Strip <plan_delta> tags and parse deltas ────────────
        const { text: noDeltaContent, deltas: _deltas } = parsePlanDeltas(finalContent);
        // TODO: apply _deltas to plan spec when wired up

        // ── Strip <project-name> tag and rename project ─────────
        let cleanContent = noDeltaContent;
        const nameMatch = noDeltaContent.match(/<project-name>(.*?)<\/project-name>/);
        if (nameMatch) {
          const projectName = nameMatch[1].trim();
          cleanContent = noDeltaContent.replace(/<project-name>.*?<\/project-name>\s*/g, '').trim();

          // Rename the project
          if (currentProject?.id && projectName) {
            updateProject(currentProject.id, { name: projectName })
              .catch(err => console.error('Failed to rename project:', err));
          }
        }

        // Update the displayed message with fully cleaned content
        if (cleanContent !== finalContent) {
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = { ...last, content: cleanContent };
            }
            return updated;
          });
        }

        // ── Persist assistant message ───────────────────────────
        if (cleanContent) {
          saveMessageToDb(conv.id, 'assistant', cleanContent, activePhase)
            .catch(err => console.error('Failed to persist assistant message:', err));
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Show error in the assistant message bubble
          setMessages(prev => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === 'assistant') {
              updated[updated.length - 1] = {
                ...last,
                content: last.content || `Something went wrong: ${(err as Error).message}`,
              };
            }
            return updated;
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [activePhase, isStreaming, ensureConversation, currentProject?.id, updateProject]
  );

  // ── Stop streaming ────────────────────────────────────────────

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ── Transition to BUILD ───────────────────────────────────────
  // Called when the user generates a dashboard from the PLAN tab.
  //
  // This is the critical moment where PLAN becomes BUILD:
  // 1. Insert a divider message ("Dashboard generated")
  // 2. Update the conversation's phase from 'plan' to 'build'
  // 3. Link the dashboard to the conversation
  //
  // The conversation ID doesn't change. Messages stay. The chat
  // thread continues seamlessly on the BUILD tab.

  const transitionToBuild = useCallback(
    async (dashboardId: string) => {
      const conv = conversationRef.current;
      if (!conv) return;

      // Insert divider message
      const dividerMsg: ChatMessage = {
        id: crypto.randomUUID(),
        conversation_id: conv.id,
        role: 'system',
        content: '',
        phase: 'build',
        metadata: { type: 'divider', label: 'Dashboard generated' },
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, dividerMsg]);

      // Persist divider, update phase, link dashboard — in parallel
      await Promise.all([
        saveMessageToDb(conv.id, 'system', '', 'build', { type: 'divider', label: 'Dashboard generated' }),
        updateConversationPhase(conv.id, 'build'),
        linkDashboardToConversation(conv.id, dashboardId),
      ]);

      // Update local conversation state
      setConversation(prev =>
        prev ? { ...prev, phase: 'build', dashboard_id: dashboardId } : prev
      );
    },
    []
  );

  // ── Save planning understanding ───────────────────────────────

  const savePlanUnderstanding = useCallback(
    async (understanding: Record<string, unknown>) => {
      const conv = conversationRef.current;
      if (!conv) return;

      await savePlanningUnderstanding(conv.id, understanding);

      setConversation(prev =>
        prev ? { ...prev, planning_understanding: understanding } : prev
      );
    },
    []
  );

  // ── Clear chat ────────────────────────────────────────────────

  const clearChat = useCallback(() => {
    setConversation(null);
    setMessages([]);
    setIsStreaming(false);
    abortRef.current?.abort();
  }, []);

  // ── Provide ───────────────────────────────────────────────────

  const value = useMemo<ChatContextType>(
    () => ({
      conversation,
      messages,
      activePhase,
      isStreaming,
      loading,
      sendMessage,
      stopStreaming,
      transitionToBuild,
      savePlanUnderstanding,
      clearChat,
      dataContext,
      setDataContext,
    }),
    [
      conversation,
      messages,
      activePhase,
      isStreaming,
      loading,
      sendMessage,
      stopStreaming,
      transitionToBuild,
      savePlanUnderstanding,
      clearChat,
      dataContext,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useChatContext(): ChatContextType {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return ctx;
}
