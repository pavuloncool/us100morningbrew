create extension if not exists pgcrypto;

create table if not exists public.briefings (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  slug text not null,
  language text not null check (language in ('pl', 'en')),
  status text not null check (status in ('draft', 'published', 'archived')),
  schema_version text not null,
  published_at timestamptz,
  payload jsonb not null,
  quality_flags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint briefings_slug_language_key unique (slug, language),
  constraint briefings_date_language_key unique (date, language),
  constraint briefings_payload_is_object check (jsonb_typeof(payload) = 'object'),
  constraint briefings_payload_language_matches check (payload ->> 'language' = language),
  constraint briefings_payload_date_matches check (payload ->> 'date' = date::text),
  constraint briefings_payload_slug_matches check (payload ->> 'slug' = slug),
  constraint briefings_payload_schema_version_matches check (payload ->> 'schemaVersion' = schema_version)
);

create index if not exists briefings_published_lookup_idx
  on public.briefings (language, status, published_at desc, date desc);

create index if not exists briefings_payload_gin_idx
  on public.briefings using gin (payload);

create table if not exists public.research_runs (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  run_date date not null,
  language text not null check (language in ('pl', 'en')),
  status text not null check (status in ('queued', 'running', 'failed', 'drafted', 'published')),
  briefing_id uuid references public.briefings(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint research_runs_date_language_key unique (run_date, language)
);

create index if not exists research_runs_date_language_idx
  on public.research_runs (run_date desc, language, status);

create table if not exists public.market_snapshots (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid references public.research_runs(id) on delete cascade,
  snapshot_date date not null,
  source text not null,
  payload jsonb not null,
  captured_at timestamptz not null default now(),
  constraint market_snapshots_payload_is_object check (jsonb_typeof(payload) = 'object')
);

create index if not exists market_snapshots_run_idx
  on public.market_snapshots (research_run_id, source);

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  title text not null,
  publisher text,
  url text not null,
  fetched_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  content_excerpt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.render_artifacts (
  id uuid primary key default gen_random_uuid(),
  briefing_id uuid not null references public.briefings(id) on delete cascade,
  format text not null check (format in ('web', 'newsletter', 'instagram_carousel')),
  language text not null check (language in ('pl', 'en')),
  artifact_url text,
  artifact_path text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists render_artifacts_briefing_idx
  on public.render_artifacts (briefing_id, format, language);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists briefings_set_updated_at on public.briefings;
create trigger briefings_set_updated_at
before update on public.briefings
for each row
execute function public.set_updated_at();

drop trigger if exists source_documents_set_updated_at on public.source_documents;
create trigger source_documents_set_updated_at
before update on public.source_documents
for each row
execute function public.set_updated_at();

alter table public.briefings enable row level security;
alter table public.research_runs enable row level security;
alter table public.market_snapshots enable row level security;
alter table public.source_documents enable row level security;
alter table public.render_artifacts enable row level security;

drop policy if exists "Published briefings are publicly readable" on public.briefings;
create policy "Published briefings are publicly readable"
on public.briefings
for select
using (status = 'published');
