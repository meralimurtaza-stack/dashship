-- Chat messages table for persisting conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_source ON chat_messages(data_source_id, created_at);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to chat_messages"
  ON chat_messages FOR ALL USING (true) WITH CHECK (true);
