create table if not exists public.ai_funding_issuers (
  id text primary key,
  ticker text not null unique,
  name text not null,
  cik text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_funding_issuers_cik_format check (cik ~ '^\d{10}$')
);

create table if not exists public.ai_funding_bonds (
  id text primary key,
  issuer_id text not null references public.ai_funding_issuers(id) on delete cascade,
  identifier_type text not null check (identifier_type in ('cusip', 'figi', 'isin', 'trace_symbol', 'other')),
  identifier_value text not null,
  tenor_bucket text not null check (tenor_bucket in ('5Y', '10Y', '30Y')),
  maturity_date date not null,
  coupon numeric,
  currency text not null default 'USD' check (currency = 'USD'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_funding_bonds_identifier_key unique (identifier_type, identifier_value)
);

create table if not exists public.ai_funding_bond_observations (
  id uuid primary key default gen_random_uuid(),
  bond_id text not null references public.ai_funding_bonds(id) on delete cascade,
  trade_date date not null,
  observed_at timestamptz not null,
  corporate_yield numeric,
  price numeric,
  volume_usd numeric,
  source text not null,
  source_url text,
  source_type text not null check (source_type in ('derived', 'finra_trace', 'fred', 'openfigi', 'public_web', 'sec_edgar', 'treasury')),
  source_timestamp timestamptz,
  last_updated timestamptz not null default now(),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  completeness text not null check (completeness in ('complete', 'partial', 'unavailable')),
  created_at timestamptz not null default now(),
  constraint ai_funding_bond_observations_yield_nonnegative check (corporate_yield is null or corporate_yield >= 0),
  constraint ai_funding_bond_observations_price_positive check (price is null or price > 0),
  constraint ai_funding_bond_observations_volume_nonnegative check (volume_usd is null or volume_usd >= 0)
);

create index if not exists ai_funding_bond_observations_lookup_idx
  on public.ai_funding_bond_observations (bond_id, trade_date desc, observed_at desc);

create table if not exists public.ai_funding_treasury_yields (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  tenor text not null check (tenor in ('5Y', '10Y', '30Y')),
  yield numeric not null check (yield >= 0),
  source text not null,
  source_url text,
  source_type text not null check (source_type in ('derived', 'finra_trace', 'fred', 'openfigi', 'public_web', 'sec_edgar', 'treasury')),
  source_timestamp timestamptz,
  last_updated timestamptz not null default now(),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  completeness text not null check (completeness in ('complete', 'partial', 'unavailable')),
  created_at timestamptz not null default now(),
  constraint ai_funding_treasury_yields_date_tenor_source_key unique (date, tenor, source)
);

create table if not exists public.ai_funding_spread_snapshots (
  id uuid primary key default gen_random_uuid(),
  issuer_id text not null references public.ai_funding_issuers(id) on delete cascade,
  bond_id text not null references public.ai_funding_bonds(id) on delete cascade,
  timestamp timestamptz not null,
  corporate_yield numeric,
  benchmark_treasury_yield numeric,
  spread_bp numeric,
  spread_change_1d numeric,
  spread_change_5d numeric,
  spread_change_20d numeric,
  source text not null,
  source_url text,
  source_type text not null check (source_type in ('derived', 'finra_trace', 'fred', 'openfigi', 'public_web', 'sec_edgar', 'treasury')),
  source_timestamp timestamptz,
  last_updated timestamptz not null default now(),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  completeness text not null check (completeness in ('complete', 'partial', 'unavailable')),
  created_at timestamptz not null default now(),
  constraint ai_funding_spread_snapshots_yields_nonnegative check (
    (corporate_yield is null or corporate_yield >= 0)
    and (benchmark_treasury_yield is null or benchmark_treasury_yield >= 0)
  )
);

create index if not exists ai_funding_spread_snapshots_lookup_idx
  on public.ai_funding_spread_snapshots (issuer_id, timestamp desc);

create table if not exists public.ai_funding_debt_issues (
  id text primary key,
  issuer_id text not null references public.ai_funding_issuers(id) on delete cascade,
  announcement_date date,
  pricing_date date,
  issue_size_usd numeric,
  orderbook_size_usd numeric,
  coverage_ratio numeric,
  initial_price_talk text,
  final_spread_bp numeric,
  comparable_secondary_spread_bp numeric,
  new_issue_concession_bp numeric,
  maturity_date date,
  coupon numeric,
  source text not null,
  source_url text,
  source_type text not null check (source_type in ('derived', 'finra_trace', 'fred', 'openfigi', 'public_web', 'sec_edgar', 'treasury')),
  source_timestamp timestamptz,
  last_updated timestamptz not null default now(),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  completeness text not null check (completeness in ('complete', 'partial', 'unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_funding_debt_issues_positive_amounts check (
    (issue_size_usd is null or issue_size_usd > 0)
    and (orderbook_size_usd is null or orderbook_size_usd > 0)
    and (coverage_ratio is null or coverage_ratio > 0)
    and (coupon is null or coupon >= 0)
  )
);

create index if not exists ai_funding_debt_issues_lookup_idx
  on public.ai_funding_debt_issues (issuer_id, (coalesce(pricing_date, announcement_date)) desc);

create table if not exists public.ai_funding_quarterly_metrics (
  id uuid primary key default gen_random_uuid(),
  issuer_id text not null references public.ai_funding_issuers(id) on delete cascade,
  quarter text not null,
  reported_capex numeric,
  previous_capex numeric,
  yoy_capex_growth numeric,
  qoq_capex_growth numeric,
  capex_guidance_low numeric,
  capex_guidance_high numeric,
  guidance_midpoint numeric,
  previous_guidance_midpoint numeric,
  guidance_revision_pct numeric,
  operating_cash_flow numeric,
  free_cash_flow numeric,
  revenue numeric,
  cloud_revenue numeric,
  ai_cloud_commentary text,
  debt_issuance numeric,
  lease_commitments numeric,
  purchase_commitments numeric,
  capex_to_operating_cash_flow numeric,
  capex_to_fcf numeric,
  source text not null,
  source_url text,
  source_type text not null check (source_type in ('derived', 'finra_trace', 'fred', 'openfigi', 'public_web', 'sec_edgar', 'treasury')),
  source_timestamp timestamptz,
  last_updated timestamptz not null default now(),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  completeness text not null check (completeness in ('complete', 'partial', 'unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_funding_quarterly_metrics_issuer_quarter_key unique (issuer_id, quarter)
);

create table if not exists public.ai_funding_events (
  id text primary key,
  issuer_id text not null references public.ai_funding_issuers(id) on delete cascade,
  date date not null,
  expected_time text,
  type text not null check (type in ('bond_maturity', 'bond_offering', 'bond_pricing', 'earnings', 'guidance_update', 'investor_day')),
  title text not null,
  watch_fields jsonb not null default '[]'::jsonb,
  source text not null,
  source_url text,
  source_type text not null check (source_type in ('derived', 'finra_trace', 'fred', 'openfigi', 'public_web', 'sec_edgar', 'treasury')),
  source_timestamp timestamptz,
  last_updated timestamptz not null default now(),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  completeness text not null check (completeness in ('complete', 'partial', 'unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_funding_events_watch_fields_array check (jsonb_typeof(watch_fields) = 'array')
);

create index if not exists ai_funding_events_date_idx
  on public.ai_funding_events (date asc, issuer_id);

create table if not exists public.ai_funding_stress_scores (
  id uuid primary key default gen_random_uuid(),
  as_of timestamptz not null unique,
  score integer not null check (score between 0 and 12),
  available_max_score integer not null check (available_max_score between 0 and 12),
  full_max_score integer not null default 12 check (full_max_score = 12),
  stress_state text not null check (stress_state in ('insufficient_data', 'low', 'moderate', 'high', 'severe')),
  components jsonb not null default '[]'::jsonb,
  dashboard_payload jsonb not null,
  source text not null,
  source_url text,
  source_type text not null check (source_type in ('derived', 'finra_trace', 'fred', 'openfigi', 'public_web', 'sec_edgar', 'treasury')),
  source_timestamp timestamptz,
  last_updated timestamptz not null default now(),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  completeness text not null check (completeness in ('complete', 'partial', 'unavailable')),
  created_at timestamptz not null default now(),
  constraint ai_funding_stress_scores_components_array check (jsonb_typeof(components) = 'array'),
  constraint ai_funding_stress_scores_payload_object check (jsonb_typeof(dashboard_payload) = 'object')
);

create index if not exists ai_funding_stress_scores_as_of_idx
  on public.ai_funding_stress_scores (as_of desc);

create table if not exists public.ai_funding_alerts (
  id text primary key,
  triggered_at timestamptz not null,
  severity text not null check (severity in ('info', 'warning', 'high', 'severe')),
  message text not null,
  source text not null,
  source_url text,
  source_type text not null check (source_type in ('derived', 'finra_trace', 'fred', 'openfigi', 'public_web', 'sec_edgar', 'treasury')),
  source_timestamp timestamptz,
  last_updated timestamptz not null default now(),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  completeness text not null check (completeness in ('complete', 'partial', 'unavailable')),
  created_at timestamptz not null default now()
);

drop trigger if exists ai_funding_issuers_set_updated_at on public.ai_funding_issuers;
create trigger ai_funding_issuers_set_updated_at
before update on public.ai_funding_issuers
for each row
execute function public.set_updated_at();

drop trigger if exists ai_funding_bonds_set_updated_at on public.ai_funding_bonds;
create trigger ai_funding_bonds_set_updated_at
before update on public.ai_funding_bonds
for each row
execute function public.set_updated_at();

drop trigger if exists ai_funding_debt_issues_set_updated_at on public.ai_funding_debt_issues;
create trigger ai_funding_debt_issues_set_updated_at
before update on public.ai_funding_debt_issues
for each row
execute function public.set_updated_at();

drop trigger if exists ai_funding_quarterly_metrics_set_updated_at on public.ai_funding_quarterly_metrics;
create trigger ai_funding_quarterly_metrics_set_updated_at
before update on public.ai_funding_quarterly_metrics
for each row
execute function public.set_updated_at();

drop trigger if exists ai_funding_events_set_updated_at on public.ai_funding_events;
create trigger ai_funding_events_set_updated_at
before update on public.ai_funding_events
for each row
execute function public.set_updated_at();

alter table public.ai_funding_issuers enable row level security;
alter table public.ai_funding_bonds enable row level security;
alter table public.ai_funding_bond_observations enable row level security;
alter table public.ai_funding_treasury_yields enable row level security;
alter table public.ai_funding_spread_snapshots enable row level security;
alter table public.ai_funding_debt_issues enable row level security;
alter table public.ai_funding_quarterly_metrics enable row level security;
alter table public.ai_funding_events enable row level security;
alter table public.ai_funding_stress_scores enable row level security;
alter table public.ai_funding_alerts enable row level security;

drop policy if exists "AI funding monitor is publicly readable" on public.ai_funding_issuers;
create policy "AI funding monitor is publicly readable"
on public.ai_funding_issuers for select using (true);

drop policy if exists "AI funding bonds are publicly readable" on public.ai_funding_bonds;
create policy "AI funding bonds are publicly readable"
on public.ai_funding_bonds for select using (true);

drop policy if exists "AI funding observations are publicly readable" on public.ai_funding_bond_observations;
create policy "AI funding observations are publicly readable"
on public.ai_funding_bond_observations for select using (true);

drop policy if exists "AI funding treasury yields are publicly readable" on public.ai_funding_treasury_yields;
create policy "AI funding treasury yields are publicly readable"
on public.ai_funding_treasury_yields for select using (true);

drop policy if exists "AI funding spreads are publicly readable" on public.ai_funding_spread_snapshots;
create policy "AI funding spreads are publicly readable"
on public.ai_funding_spread_snapshots for select using (true);

drop policy if exists "AI funding debt issues are publicly readable" on public.ai_funding_debt_issues;
create policy "AI funding debt issues are publicly readable"
on public.ai_funding_debt_issues for select using (true);

drop policy if exists "AI funding quarterly metrics are publicly readable" on public.ai_funding_quarterly_metrics;
create policy "AI funding quarterly metrics are publicly readable"
on public.ai_funding_quarterly_metrics for select using (true);

drop policy if exists "AI funding events are publicly readable" on public.ai_funding_events;
create policy "AI funding events are publicly readable"
on public.ai_funding_events for select using (true);

drop policy if exists "AI funding scores are publicly readable" on public.ai_funding_stress_scores;
create policy "AI funding scores are publicly readable"
on public.ai_funding_stress_scores for select using (true);

drop policy if exists "AI funding alerts are publicly readable" on public.ai_funding_alerts;
create policy "AI funding alerts are publicly readable"
on public.ai_funding_alerts for select using (true);
