-- Add context columns to dashboards for preserving state across navigation
ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS chat_messages JSONB DEFAULT '[]';
ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS data_context JSONB DEFAULT NULL;
ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS calculated_fields JSONB DEFAULT '[]';
