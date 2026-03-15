-- Draft and saved dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_source_id UUID,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sheets JSONB NOT NULL DEFAULT '[]'::jsonb,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  data JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER set_dashboards_updated_at
  BEFORE UPDATE ON dashboards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS policies (permissive for now)
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to dashboards"
  ON dashboards
  FOR ALL
  USING (true)
  WITH CHECK (true);
