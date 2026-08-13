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
US100_GENERATION_PROVIDER=openai
OPENAI_API_KEY=<openai-api-key>
OPENAI_MODEL=gpt-5
US100_GENERATION_TARGET_STATUS=draft
US100_CRON_LOCALES=pl,en
US100_REVIEW_SECRET=<private-review-token>
```

Rekomendacja produkcyjna: `US100_GENERATION_TARGET_STATUS=draft`.
Briefing staje sie publiczny dopiero po akceptacji w `/review`.

## Approval

Prywatny ekran:

```txt
GET /review?token=$US100_REVIEW_SECRET
```

Po akceptacji:

- status briefingu zmienia sie z `draft` na `published`,
- publiczna strona zaczyna renderowac briefing,
- system probuje utworzyc draft newslettera w Kit, jesli Kit jest
  skonfigurowany.

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
- OpenAI Responses API adapter jest gotowy.
- Prawdziwe collectory danych rynkowych/newsowych nie sa jeszcze podlaczone;
  endpoint uzywa obecnie fixture collector/analyzer.
