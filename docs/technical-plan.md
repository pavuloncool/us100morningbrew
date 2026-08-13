# US100 Morning Brew - plan techniczny

## Rekomendowany stack

- Next.js App Router dla WWW.
- pnpm workspace.
- TypeScript.
- Zod jako schema source of truth.
- Supabase Postgres jako storage.
- Vercel jako hosting.
- Vercel Cron albo zewnetrzny scheduler dla codziennego uruchamiania.

## Proponowana struktura repo

```txt
/Users/pa/projects/tg2b
  apps/web
  packages/contracts
  packages/design-system
  packages/research
  packages/storage
  packages/renderers
  docs
```

Opis:

- `apps/web` - publiczna aplikacja WWW.
- `packages/contracts` - schema briefingu, typy, walidacja payloadow.
- `packages/design-system` - lokalna adaptacja tokenow i prymitywow UI.
- `packages/research` - ingestion danych, research pipeline, generation pipeline.
- `packages/storage` - repository abstraction i adapter Supabase REST.
- `packages/renderers` - pozniejsze renderery Instagram/newsletter.
- Wizualizacje w web app powinny byc generowane deterministycznie z tych samych
  danych strukturalnych, aby pozniej mozna bylo uzyc ich w newsletterze i
  karuzelach.
- `docs` - decyzje, plany, runbooki.

## Model danych

Glowna encja: `briefings`.

Polski pozostaje domyslnym jezykiem publikacji i newslettera. Web app obsluguje
takze wersje EN przez osobne trasy locale. W praktyce oznacza to, ze kazdy
briefing ma structured payload w konkretnym jezyku (`language: "pl"` albo
`language: "en"`), a frontend renderuje tresc z tego payloadu.

Minimalne pola:

- `id`
- `date`
- `slug`
- `status`
- `schema_version`
- `language`
- `published_at`
- `headline`
- `verdict`
- `key_signal`
- `sections`
- `thesis_scorecard`
- `what_changed`
- `levels_to_watch`
- `sources`
- `quality_flags`
- `created_at`
- `updated_at`

Encje pomocnicze:

- `research_runs` - status uruchomienia pipeline, bledy, metryki, czas.
- `market_snapshots` - dane wejściowe uzyte do briefingu.
- `source_documents` - zrodla, linki, metadata, fetched_at.
- `render_artifacts` - pozniej PNG/HTML dla Instagram/newsletter.

## Szkic structured output

```json
{
  "date": "2026-08-13",
  "language": "pl",
  "headline": "...",
  "verdict": {
    "stance": "short_thesis_strengthened",
    "confidence": "medium",
    "summary": "..."
  },
  "keySignal": {
    "title": "...",
    "observation": "...",
    "whyItMatters": "...",
    "evidence": []
  },
  "sections": {
    "priceAction": {},
    "breadth": {},
    "aiSemis": {},
    "ratesFed": {},
    "volatility": {}
  },
  "thesisScorecard": [],
  "whatChanged": [],
  "levelsToWatch": [],
  "sources": []
}
```

To jest szkic roboczy. Aktualny schema dopuszcza `language: "pl" | "en"`;
publikacja wielojezyczna powinna powstawac jako oddzielne rekordy/payloady dla
danego locale, a nie jako przypadkowa mieszanka jezykow w jednym briefingu.

## Research / generation pipeline

1. Scheduler uruchamia `morning-brew` dla daty sesji.
2. System sprawdza, czy briefing dla tej daty juz istnieje.
3. Collector pobiera dane rynkowe i newsy.
4. Analyzer liczy sygnaly deterministyczne: trend, DMA, breadth, leaders, rates,
   VIX, divergence flags.
5. Evidence pack trafia do modelu.
6. Model zwraca strict structured output.
7. Zod waliduje kompletność i jakosc.
8. Briefing trafia do bazy jako draft albo published.
9. WWW renderuje najnowszy briefing i archiwum.

## Automatyczne uruchamianie

Docelowo: poniedzialek-piatek, 08:00 Europe/Warsaw.

Vercel Cron dziala w UTC, wiec trzeba uwzglednic zmiane czasu:

- uruchomienia kandydackie o 06:00 UTC i 07:00 UTC,
- guard w aplikacji sprawdza, czy lokalnie w Polsce jest 08:00,
- idempotency blokuje podwojny briefing dla tej samej daty.

## Etapy implementacji

### Etap 0 - przygotowanie

- Zatwierdzic ten plan.
- Ustalic, czy pierwsza wersja ma publikowac automatycznie, czy jako draft.
- Ustalic providerow danych.

### Etap 1 - fundament

- Scaffold pnpm workspace.
- Dodac `apps/web`.
- Dodac `packages/contracts` z pierwsza wersja schema.
- Dodac fixture briefing JSON.
- Zbudowac statyczny frontend na fixture data.

### Etap 2 - storage

- Status: wykonany w kodzie, bez uruchamiania migracji na aktywnej bazie.
- Dodano Supabase migrations.
- Dodano repository abstraction.
- Podlaczono najnowszy briefing, archiwum i permalink.
- Dodano fixture fallback, zeby lokalny frontend dzialal bez env Supabase.

### Etap 3 - pipeline

- Status: wykonany jako skeleton.
- Dodano research run skeleton.
- Dodano collector/analyzer interface.
- Dodano generation step ze strict schema.
- Dodano quality gates.
- Realne data providery i realny OpenAI call zostaja do podpiecia w Etapie 4.

### Etap 4 - automatyzacja

- Status: wykonany w kodzie i gotowy do konfiguracji Vercel.
- Dodano cron endpoint.
- Dodano idempotency.
- Dodano env vars i deployment config.
- Wdrozenie na Vercel wymaga skonfigurowania projektu `apps/web` i env vars.

### Etap 5 - formaty pochodne

- Dodac renderer carousel HTML/CSS.
- Dodac deterministic PNG export.
- Dodac newsletter renderer.

## Decyzje wymagane przed kodem aplikacji

1. Czy pierwsza wersja publikuje automatycznie, czy zapisuje draft do recenzji.
2. Jakie zrodla danych sa akceptowalne kosztowo i licencyjnie.
3. Jakie zrodla danych sa akceptowalne kosztowo i licencyjnie dla pierwszego
   automatycznego pipeline'u.
