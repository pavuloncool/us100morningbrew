alter table if exists public.research_runs
  drop constraint if exists research_runs_date_language_key;

alter table if exists public.briefings
  drop constraint if exists briefings_date_language_key;
