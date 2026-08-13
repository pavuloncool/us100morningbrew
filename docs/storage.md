# Storage

Etap 2 wprowadza Supabase jako docelowy storage dla structured Morning Brew.

## Status

- Migracja schema znajduje sie w `supabase/migrations`.
- Web app korzysta z repository abstraction.
- Cron korzysta z `research_runs` jako idempotency ledger.
- Jesli env Supabase nie jest ustawiony, aplikacja uzywa fixture fallback.
- Aktywna lokalna baza Supabase dla tego repo nie zostala jeszcze uruchomiona.

## Env

```bash
US100_STORAGE_PROVIDER=auto
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

Opcje:

- `US100_STORAGE_PROVIDER=auto` - uzywa Supabase, gdy sa env vars; inaczej fixture.
- `US100_STORAGE_PROVIDER=fixture` - wymusza fixture.
- `US100_STORAGE_PROVIDER=supabase` - wymaga Supabase env vars i przerywa start, jesli ich brakuje.

Do publicznego odczytu wystarczy anon key, jesli dziala RLS policy dla
`published`. Do zapisu pipeline powinien uzywac service role key po stronie
serwera.

## Tabele

- `briefings` - glowny rekord publikacji, z `payload jsonb` jako structured data.
- `research_runs` - przebiegi pipeline i statusy.
- `market_snapshots` - wejscia rynkowe wykorzystane w analizie.
- `source_documents` - dokumenty i linki zrodlowe.
- `render_artifacts` - przyszle artefakty newsletter/Instagram.

## Model publikacji

Kazdy jezyk jest osobnym rekordem:

- unikalny `(slug, language)`,
- unikalny `(date, language)`,
- `payload.language` musi odpowiadac kolumnie `language`.

PL pozostaje domyslnym kanalem publikacji i newslettera. EN jest osobnym locale
w web app.
