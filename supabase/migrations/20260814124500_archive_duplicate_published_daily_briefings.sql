with ranked_daily_publications as (
  select
    id,
    row_number() over (
      partition by date, language
      order by published_at desc nulls last, created_at desc
    ) as publication_rank
  from public.briefings
  where status = 'published'
)
update public.briefings as briefing
set
  status = 'archived',
  payload = jsonb_set(briefing.payload, '{status}', '"archived"', false),
  updated_at = now()
from ranked_daily_publications
where briefing.id = ranked_daily_publications.id
  and ranked_daily_publications.publication_rank > 1;
