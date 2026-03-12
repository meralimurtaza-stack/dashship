-- Published dashboards table
create table if not exists published_dashboards (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  dashboard_name text not null,
  access_level text not null default 'public',
  password_hash text,
  allowed_emails jsonb default '[]'::jsonb,
  branding jsonb default '{}'::jsonb,
  embed_enabled boolean default true,
  sheets jsonb not null default '[]'::jsonb,
  layout jsonb not null default '{}'::jsonb,
  data jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index on slug for fast lookups
create index if not exists idx_published_dashboards_slug on published_dashboards(slug);

-- Email schedules table
create table if not exists email_schedules (
  id uuid primary key default gen_random_uuid(),
  dashboard_id text not null,
  recipients jsonb not null default '[]'::jsonb,
  frequency text not null default 'weekly',
  day_of_week integer,
  day_of_month integer,
  time_utc text default '09:00',
  format text default 'html',
  subject text,
  enabled boolean default true,
  created_at timestamptz default now()
);
