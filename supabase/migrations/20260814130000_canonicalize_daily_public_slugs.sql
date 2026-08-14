do $$
declare
  canonical_slug text;
  conflict_record record;
  latest_publication record;
begin
  for latest_publication in
    select *
    from (
      select
        id,
        date,
        language,
        payload,
        published_at,
        slug,
        row_number() over (
          partition by date, language
          order by published_at desc nulls last, created_at desc
        ) as publication_rank
      from public.briefings
      where status = 'published'
    ) ranked_publications
    where publication_rank = 1
  loop
    canonical_slug := latest_publication.date::text || '-us100-morning-brew';

    if latest_publication.slug <> canonical_slug then
      for conflict_record in
        select id, slug
        from public.briefings
        where language = latest_publication.language
          and slug = canonical_slug
          and id <> latest_publication.id
      loop
        update public.briefings
        set
          slug = canonical_slug || '-archived-' || left(conflict_record.id::text, 8),
          status = 'archived',
          payload = jsonb_set(
            jsonb_set(
              payload,
              '{slug}',
              to_jsonb(canonical_slug || '-archived-' || left(conflict_record.id::text, 8)),
              false
            ),
            '{status}',
            '"archived"',
            false
          ),
          updated_at = now()
        where id = conflict_record.id;
      end loop;

      update public.briefings
      set
        slug = canonical_slug,
        payload = jsonb_set(payload, '{slug}', to_jsonb(canonical_slug), false),
        updated_at = now()
      where id = latest_publication.id;
    end if;
  end loop;
end $$;
