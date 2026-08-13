# US100 Morning Brew - stan projektu

Data utworzenia: 2026-08-13

## Cel

Zbudowac osobna aplikacje webowa, ktora automatycznie zbiera dane, generuje
codzienny US100 Morning Brew i publikuje go w czytelnej formie internetowej.

## Decyzje

- Nowy projekt mieszka bezposrednio w `/Users/pa/projects/tg2b`.
- `/Users/pa/projects/tg2b` jest rootem repozytorium.
- `neoneon` i `roastnbrew` sa tylko referencjami.
- Nie kopiujemy calych projektow referencyjnych.
- Nie modyfikujemy projektow referencyjnych bez wyraznej zgody.
- Pierwszy techniczny slice aplikacji zostal wdrozony na fixture fallback.
- Etap 2 storage zostal dodany jako migracje Supabase i repository abstraction.
- Etap 3 pipeline zostal dodany jako skeleton collect/analyze/generate/validate.
- Etap 4 automatyzacja zostal dodany jako Vercel Cron endpoint z OpenAI adapterem
  i idempotency.
- Etap 5 approval + newsletter zostal dodany jako prywatny review flow,
  publikacja po akceptacji i opcjonalny draft newslettera w Kit.

## Product Principles

- One research process -> structured data -> multiple presentation formats.
- Frontend renderuje dane strukturalne.
- Polski pozostaje domyslnym jezykiem publikacji i newslettera.
- Web app obsluguje dodatkowa wersje EN przez osobne trasy locale i osobny
  structured payload dla kazdego briefingu.
- Briefing ma falsyfikowac srednioterminowa teze short na US100, a nie tylko jej
  szukac potwierdzenia.
- Kazdy istotny sygnal musi miec wyjasnienie "dlaczego to ma znaczenie".
- Kazdy briefing wybiera najwazniejsza informacje dnia i tlumaczy, dlaczego jest
  najwazniejsza dla US100.

## Zakres pierwszej wersji

- Najnowszy briefing.
- Archiwum briefingow.
- Permalink pojedynczego briefingu.
- Najwazniejszy sygnal dnia.
- Thesis / market scorecard.
- Sekcje: price action, breadth, AI/semis, rates/Fed, volatility, what changed,
  levels/signals to watch, sources.

## Poza pierwsza wersja

- Instagram carousel renderer.
- Pelny panel redakcyjny.
- Multi-user auth.

## Wykonane w pierwszym slicie

- Utworzono pnpm monorepo w root `/Users/pa/projects/tg2b`.
- Dodano `apps/web` jako aplikacje Next.js.
- Dodano `packages/contracts` ze schematem `MorningBrewSchema`.
- Dodano `language: "pl" | "en"` w schemacie briefingu.
- Dodano wymog strukturalny `whyItMatters` dla verdict, key signal, sekcji,
  scorecard i watch items.
- Dodano `packages/design-system` z lokalnymi tokenami CSS/TS.
- Dodano `packages/research` z fixture briefing data.
- `/` przekierowuje do domyslnej wersji `/pl`.
- `/pl` i `/en` renderuja najnowszy briefing w wybranym jezyku.
- `/pl/archive` i `/en/archive` renderuja archiwum w wybranym jezyku.
- `/pl/briefings/2026-08-13-us100-morning-brew` i
  `/en/briefings/2026-08-13-us100-morning-brew` renderuja permalink.
- Stare adresy `/archive` i `/briefings/...` przekierowuja do wersji `/pl`.
- Dodano radar czynnikow pokazujacy, co wzmacnia lub oslabia teze short.
- Dodano filtr sygnalow: wszystkie / wzmacnia / oslabia / mieszane lub bez
  zmiany.
- Dodano realny przelacznik jezyka PL/EN w web app; zmienia on trase i pobiera
  briefing dla wybranego locale.

## Wykonane w Etapie 2 - Storage

- Dodano `packages/storage` z `BriefingRepository`.
- Dodano Supabase REST repository dla tabeli `briefings`.
- Dodano fallback repository oparty o fixture data, gdy env Supabase nie jest
  ustawiony.
- Przepieto najnowszy briefing, archiwum i permalink na async repository layer.
- Dodano migracje Supabase w `supabase/migrations`.
- Dodano tabele: `briefings`, `research_runs`, `market_snapshots`,
  `source_documents`, `render_artifacts`.
- Dodano RLS policy publicznego odczytu tylko dla `published` briefings.
- Dodano `.env.example` i `docs/storage.md`.
- Nie uruchomiono migracji na aktywnej bazie, bo ten projekt nie ma jeszcze
  wlasnego lokalnego wolumenu Supabase; aktywny Docker DB nalezy do `roastnbrew`.

## Wykonane w Etapie 3 - Pipeline

- Dodano `ResearchRunContext`, `EvidencePack`, `AnalysisOutput` i
  `PipelineRunResult`.
- Dodano interfejsy `ResearchCollector`, `SignalAnalyzer`, `BriefingGenerator`
  i `BriefingWriter`.
- Dodano `createMorningBrewPipeline`, ktory wykonuje collect -> analyze ->
  generate -> strict schema validation -> quality gates -> opcjonalny zapis.
- Dodano `StructuredGenerationClient` jako miejsce na pozniejsze podpiecie
  OpenAI/ChatGPT.
- Dodano fixture collector/analyzer/generator do lokalnego testowania pipeline.
- Dodano default quality gates: zgodnosc locale/date, komplet sekcji, glebokosc
  `whyItMatters`, evidence/sources i balans falsyfikujacy teze short.
- Nie dodano jeszcze prawdziwych data providerow ani CRON; to zakres Etapu 4.

## Wykonane w Etapie 4 - Automatyzacja

- Dodano `apps/web/app/api/cron/morning-brew/route.ts`.
- Dodano `apps/web/lib/automation.ts` z guardem 08:00 Europe/Warsaw.
- Dodano `apps/web/vercel.json` z dwoma kandydackimi cronami UTC:
  `0 6 * * 1-5` i `0 7 * * 1-5`.
- Dodano zabezpieczenie `CRON_SECRET`.
- Dodano `OPENAI_API_KEY`, `OPENAI_MODEL`, `US100_GENERATION_PROVIDER` i
  `US100_GENERATION_TARGET_STATUS` do env example.
- Dodano realny adapter OpenAI Responses API w `packages/research/src/generation.ts`.
- Dodano strict JSON schema dla structured output przekazywany do OpenAI.
- Dodano idempotency dla `research_runs` przez `idempotency_key`.
- Dodano storage repository do claim/complete research runs.
- Endpoint nadal uzywa fixture collector/analyzer; prawdziwe data providery sa
  nastepnym etapem pracy.

## Wykonane w Etapie 5 - Approval + Newsletter

- Dodano prywatne logowanie redakcyjne `/review/login` z kodem e-mail przez
  Supabase Auth.
- Dodano allowliste `US100_REVIEW_EMAILS`.
- Dodano liste draftow do akceptacji.
- Dodano podglad pojedynczego draftu pod
  `/review/[locale]/briefings/[slug]`.
- Dodano endpoint `POST /api/review/publish`.
- Po akceptacji briefing zmienia status na `published`, a publiczna strona
  zaczyna go renderowac.
- Dodano deterministic newsletter HTML renderer.
- Dodano Kit API v4 adapter tworzacy broadcast draft po publikacji.
- Wynik newslettera jest zapisywany w `render_artifacts` jako format
  `newsletter`.
- Newsletter nie jest wysylany automatycznie.

## Ostatnia walidacja

- `pnpm typecheck` przechodzi.
- `pnpm test` przechodzi.
- `pnpm build` przechodzi.
- `pnpm --filter @us100/research test` przechodzi.
- `apps/web` ma test guardu harmonogramu cron.
- Lokalny dev server: `http://127.0.0.1:3000`.
