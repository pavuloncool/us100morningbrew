# US100 Morning Brew

Root repozytorium dla osobnej aplikacji webowej publikujacej codzienny briefing
US100 / Nasdaq-100.

Repo zawiera pierwszy techniczny slice aplikacji: Next.js web app, schema danych,
fixture fallback, storage abstraction, migracje Supabase, archiwum, permalink i
mechanizm wersji jezykowych, skeleton pipeline research/generation oraz Vercel
Cron endpoint.

## Ustalone

- Root projektu: `/Users/pa/projects/tg2b`
- Projekt referencyjny deployment/Next.js: `/Users/pa/projects/neoneon/blog`
- Projekt referencyjny design system: `/Users/pa/projects/roastnbrew`
- Nie modyfikujemy projektow referencyjnych bez wyraznej zgody.
- Podstawowy artefakt briefingu to structured data, nie markdownowy blob.
- Docelowy storage to Supabase Postgres; lokalnie aplikacja moze dzialac na
  fixture fallback bez skonfigurowanej bazy.
- Polski pozostaje domyslnym jezykiem publikacji i newslettera.
- Web app obsluguje tez osobna wersje EN przez trasy `/en/...`; kazdy jezyk ma
  miec wlasny structured payload, a nie automatycznie przetlumaczony UI-only widok.
- Jedno badanie rynku ma zasilac wiele formatow: WWW, archiwum, pozniej Instagram
  i newsletter.

## Dokumenty

- `docs/project-state.md` - stan projektu i decyzje robocze.
- `docs/reference-inventory.md` - read-only inventory projektow referencyjnych.
- `docs/pipeline.md` - skeleton pipeline, generation adapter i quality gates.
- `docs/automation.md` - Vercel Cron, env vars, idempotency i deployment.
- `docs/storage.md` - schema storage, env i model publikacji.
- `docs/technical-plan.md` - proponowana architektura, model danych i etapy.
