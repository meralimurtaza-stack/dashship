/**
 * types/chat.ts
 *
 * Type definitions for the DashShip chat system.
 *
 * Key changes from the old version:
 * - ChatMessage now includes conversation_id, phase, metadata, created_at
 * - Role includes 'system' for divider messages
 * - MessageMetadata is a discriminated union for different widget types
 * - Conversation type added for the conversations table
 * - DataContextColumn and ChatDataContext unchanged (still needed by chat-api.ts)
 */

// ─── Conversation ─────────────────────────────────────────────────
// Matches the Supabase `conversations` table

export type ConversationPhase = 'data' | 'plan' | 'build';

export interface Conversation {
  id: string;
  project_id: string;
  dashboard_id: string | null;
  phase: ConversationPhase;
  planning_understanding: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ─── Chat messages ────────────────────────────────────────────────
// Matches the Supabase `chat_messages` table

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  phase: ConversationPhase;
  metadata: MessageMetadata | null;
  created_at: string;
}

/**
 * Discriminated union for structured message content.
 *
 * Plain text messages have metadata: null.
 * Structured messages (recommendations, wireframes, config patches)
 * use metadata to carry the data that the UI renders as widgets.
 *
 * The `content` field always has a text version too — this is what
 * gets sent to Claude as conversation history so it has context.
 */
export type MessageMetadata =
  | { type: 'recommendations'; recommendations: Recommendation[] }
  | { type: 'wireframe'; wireframe: WireframeLayout }
  | { type: 'config_patch'; patch: Record<string, unknown> }
  | { type: 'divider'; label: string };

// ─── Recommendations (DATA tab) ──────────────────────────────────

export interface Recommendation {
  id: string;
  type: 'rename' | 'reclassify' | 'type_change' | 'hide';
  field: string;
  from?: string;
  to?: string;
  reason: string;
  status: 'pending' | 'approved' | 'skipped';
}

// ─── Wireframe (PLAN tab) ────────────────────────────────────────
// Placeholder — we'll flesh this out when we build the PLAN page

export interface WireframeLayout {
  filters?: Array<{ field: string; type: string }>;
  kpis?: Array<{ name: string; formula: string; format: string }>;
  charts?: Array<{ name: string; type: string; xField: string; yField: string }>;
}

// ─── Data context (unchanged — used by chat-api.ts) ──────────────

export interface DataContextColumn {
  name: string;
  displayName: string | null;
  type: string;
  role: 'dimension' | 'measure';
  sampleValues: string[];
}

export interface ChatDataContext {
  sourceName: string;
  sourceId: string;
  rowCount: number;
  columns: DataContextColumn[];
}
