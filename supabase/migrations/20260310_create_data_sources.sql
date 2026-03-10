-- Create data_sources table for persisting uploaded datasets
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID DEFAULT NULL,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
  file_size_bytes BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  schema JSONB NOT NULL,
  profile JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for listing by project
CREATE INDEX IF NOT EXISTS idx_data_sources_project_id ON data_sources (project_id);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_data_sources_updated_at
  BEFORE UPDATE ON data_sources
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for uploaded data files
INSERT INTO storage.buckets (id, name, public)
VALUES ('data-files', 'data-files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies (permissive for now, tighten with auth later)
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to data_sources"
  ON data_sources
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all access to data-files bucket"
  ON storage.objects
  FOR ALL
  USING (bucket_id = 'data-files')
  WITH CHECK (bucket_id = 'data-files');
