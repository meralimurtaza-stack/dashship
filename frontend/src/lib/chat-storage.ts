/**
 * chat-storage.ts
 *
 * Pure Supabase read/write layer for conversations and chat messages.
 * No React, no hooks, no state — just database operations.
 *
 * This is the lowest layer. ChatContext calls these functions.
 * Other contexts (like DataSourceContext) may also call them
 * to create conversations when data is uploaded.
 *
 * Key design decisions:
 * - All functions take explicit IDs (no reading from context)
 * - All functions return typed results (no raw Supabase rows leak out)
 * - Errors throw (caller decides how to handle)
 * - Messages include metadata for structured widgets (recommendations, wireframes)
 */

import { supabase } from './supabase';
import type {
  Conversation,
  ConversationPhase,
  ChatMessage,
  MessageMetadata,
} from '../types/chat';

// ─── Conversations ────────────────────────────────────────────────

/**
 * Create a new conversation for a project.
 *
 * Called when:
 * - User uploads data → DATA conversation created
 * - User sends first PLAN message → PLAN conversation created
 *
 * We generate the UUID client-side (same pattern as ProjectContext)
 * so we can optimistically update the UI before the insert completes.
 */
export async function createConversation(
  projectId: string,
  phase: ConversationPhase
): Promise<Conversation> {
  const id = crypto.randomUUID();

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      id,
      project_id: projectId,
      phase,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create conversation: ${error.message}`);
  }

  return mapConversationRow(data);
}

/**
 * Load a conversation by project and phase.
 *
 * For DATA: looks for phase='data'
 * For PLAN/BUILD: looks for phase IN ('plan', 'build') — because
 * PLAN and BUILD share one conversation that transitions.
 *
 * Returns null if no conversation exists yet (user hasn't started chatting).
 */
export async function loadConversation(
  projectId: string,
  activePhase: ConversationPhase
): Promise<Conversation | null> {
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('project_id', projectId);

  if (activePhase === 'data') {
    // DATA has its own separate conversation
    query = query.eq('phase', 'data');
  } else {
    // PLAN and BUILD share one conversation
    query = query.in('phase', ['plan', 'build']);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load conversation: ${error.message}`);
  }

  return data ? mapConversationRow(data) : null;
}

/**
 * Update a conversation's phase.
 * Used for the PLAN → BUILD transition.
 */
export async function updateConversationPhase(
  conversationId: string,
  phase: ConversationPhase
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ phase, updated_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (error) {
    throw new Error(`Failed to update conversation phase: ${error.message}`);
  }
}

/**
 * Link a dashboard to a conversation.
 * Called after dashboard generation — connects the conversation
 * to the dashboard it produced.
 */
export async function linkDashboardToConversation(
  conversationId: string,
  dashboardId: string
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({
      dashboard_id: dashboardId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (error) {
    throw new Error(`Failed to link dashboard: ${error.message}`);
  }
}

/**
 * Save the PlanningUnderstanding to the conversation.
 * Called when the user clicks "Generate Dashboard" on the PLAN tab.
 * This is what gets sent to the generation prompt — NOT the chat history.
 */
export async function savePlanningUnderstanding(
  conversationId: string,
  understanding: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({
      planning_understanding: understanding,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  if (error) {
    throw new Error(`Failed to save planning understanding: ${error.message}`);
  }
}

// ─── Messages ─────────────────────────────────────────────────────

/**
 * Load all messages for a conversation, ordered chronologically.
 */
export async function loadMessages(
  conversationId: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to load messages: ${error.message}`);
  }

  return (data || []).map(mapMessageRow);
}

/**
 * Save a single message to a conversation.
 *
 * Returns the saved message with its server-generated ID and timestamp.
 * The caller passes a client-generated UUID — if we wanted to match
 * optimistic updates, we could use it, but for now we let Supabase
 * generate the ID and return it.
 */
export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  phase: ConversationPhase,
  metadata: MessageMetadata | null = null
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
      phase,
      metadata: metadata ?? undefined,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save message: ${error.message}`);
  }

  return mapMessageRow(data);
}

// ─── Row mappers ──────────────────────────────────────────────────
// These convert raw Supabase rows into typed objects.
// Centralised here so if column names change, we fix one place.

function mapConversationRow(row: any): Conversation {
  return {
    id: row.id,
    project_id: row.project_id,
    dashboard_id: row.dashboard_id ?? null,
    phase: row.phase as ConversationPhase,
    planning_understanding: row.planning_understanding ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapMessageRow(row: any): ChatMessage {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    role: row.role as ChatMessage['role'],
    content: row.content,
    phase: row.phase as ConversationPhase,
    metadata: row.metadata ?? null,
    created_at: row.created_at,
  };
}
