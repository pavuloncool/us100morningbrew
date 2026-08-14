# Automation / Vercel Cron

Etap 4 dodaje endpoint cron i konfiguracje pod Vercel.

## Endpoint

```txt
GET /api/cron/morning-brew
```

Plik:

```txt
apps/web/app/api/cron/morning-brew/route.ts
```

Endpoint:

- wymaga `Authorization: Bearer $CRON_SECRET` w production,
- lokalnie dziala bez sekretu, jesli `NODE_ENV !== "production"`,
- sprawdza okno uruchomienia `08:00 Europe/Warsaw`,
- obsluguje duplicate delivery przez idempotency key
  `morning-brew:<date>:<locale>`,
- uruchamia pipeline collect -> analyze -> generate -> validate -> quality gates,
- zapisuje briefing przez storage repository.

## Vercel Cron

Konfiguracja jest w:

```txt
apps/web/vercel.json
```

Sa dwa kandydackie uruchomienia UTC:

- `0 6 * * 1-5`
- `0 7 * * 1-5`

Powod: 08:00 czasu polskiego wypada o 06:00 UTC latem i 07:00 UTC zima.
Endpoint ma guard czasu warszawskiego, wiec tylko jedno z tych wywolan przejdzie
danego dnia.

## Env na Vercel

Minimalny zestaw production:

```bash
CRON_SECRET=<losowy sekret>
US100_STORAGE_PROVIDER=supabase
SUPABASE_URL=<project-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
US100_RESEARCH_PROVIDER=budget
US100_GENERATION_PROVIDER=openai
OPENAI_API_KEY=<openai-api-key>
OPENAI_MODEL=gpt-5-mini
US100_GENERATION_TARGET_STATUS=draft
US100_CRON_LOCALES=pl,en
US100_REVIEW_SECRET=<private-review-token>
US100_REVIEW_EMAILS=<email-1,email-2>
SUPABASE_ANON_KEY=<supabase-anon-key>
US100_BUDGET_MAX_REQUESTS=30
US100_BUDGET_NEWS_RSS_ENABLED=true
FRED_API_KEY=<optional-free-fred-api-key>
```

Rekomendacja produkcyjna: `US100_GENERATION_TARGET_STATUS=draft`.
Briefing staje sie publiczny dopiero po akceptacji w `/review`.

Opcjonalne limity dla recznego przycisku w `/review`:

```bash
US100_RERUN_MAX_REQUESTS=15
US100_RERUN_REQUEST_TIMEOUT_MS=4000
US100_RERUN_OPENAI_TIMEOUT_MS=45000
US100_RERUN_OPENAI_MAX_OUTPUT_TOKENS=6000
US100_RERUN_OPENAI_REASONING_EFFORT=minimal
US100_RERUN_OPENAI_TEXT_VERBOSITY=low
US100_RERUN_NEWS_RSS_ENABLED=false
```

Reczny rerun jest celowo krotszy niz poranny cron: domyslnie uruchamia tylko
wersje PL, bez RSS news, z mniejsza liczba zapytan i limitem OpenAI ustawionym
tak, zeby funkcja zdazyla zapisac wynik albo blad przed timeoutem Vercel.
Budget collector pobiera zrodla rownolegle, zeby wiele wolnych odpowiedzi z
zewnetrznych serwisow nie blokowalo calego uruchomienia sekwencyjnie.

## Approval

Prywatny ekran logowania:

```txt
GET /review/login
```

Uzytkownik wpisuje e-mail z allowlisty `US100_REVIEW_EMAILS`, otrzymuje kod,
wpisuje kod i uzyskuje dostep do `/review` przez sesje cookie. Stary wariant
`/review?token=$US100_REVIEW_SECRET` zostaje jako awaryjny fallback.

Po akceptacji:

- status briefingu zmienia sie z `draft` na `published`,
- publiczna strona zaczyna renderowac briefing,
- system probuje utworzyc draft newslettera w Kit, jesli Kit jest
  skonfigurowany.

W `/review` jest tez przycisk do recznego ponowienia dzisiejszego briefingu PL.
Jest przeznaczony do testow i napraw po bledzie. Jezeli poprzednie uruchomienie
zostalo przerwane przez timeout Vercel i zostalo w statusie `running`, system po
5 minutach traktuje je jako przeterminowane i pozwala je ponowic.

## Newsletter / Kit

Opcjonalne env:

```bash
US100_NEWSLETTER_PROVIDER=kit
KIT_API_KEY=<kit-api-key>
KIT_EMAIL_TEMPLATE_ID=<optional-template-id>
KIT_BROADCAST_PUBLIC=false
KIT_SUBSCRIBER_FILTER=<optional-json-filter>
NEXT_PUBLIC_APP_URL=https://<production-domain>
```

Newsletter nie jest wysylany automatycznie. Approval tworzy draft broadcastu w
Kit.

## Manualne wywolanie

Lokalnie:

```bash
curl "http://127.0.0.1:3000/api/cron/morning-brew?force=1&date=2026-08-13&locales=pl"
```

Production wymaga naglowka:

```bash
curl \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://<domain>/api/cron/morning-brew?force=1&date=2026-08-13&locales=pl"
```

## Status

- Endpoint cron jest gotowy.
- Idempotency jest gotowe na poziomie storage/research_runs.
- Failed research runs moga byc ponowione po naprawie przyczyny bledu, bez
  recznego czyszczenia bazy.
- Stale `running` research runs po timeoutach Vercel moga byc ponowione po 5
  minutach, bez recznego czyszczenia bazy.
- OpenAI Responses API adapter jest gotowy.
- OpenAI Responses API adapter ma limit czasu konfigurowany przez
  `OPENAI_REQUEST_TIMEOUT_MS`; reczny rerun uzywa `US100_RERUN_OPENAI_TIMEOUT_MS`.
- OpenAI Responses API adapter ustawia szybki tryb dla GPT-5 przez
  `OPENAI_REASONING_EFFORT=minimal`, `OPENAI_TEXT_VERBOSITY=low` i
  `OPENAI_MAX_OUTPUT_TOKENS`.
- Budget Research Pipeline jest dostepny przez `US100_RESEARCH_PROVIDER=budget`.
  Uzywa low-cost daily data i nie pobiera real-time market data.
