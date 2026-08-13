# Approval + Newsletter

Etap 5 dodaje human-in-the-loop przed publikacja i newsletterem.

## Przeplyw

1. Cron generuje Morning Brew jako `draft`.
2. Prywatny ekran `/review?token=<US100_REVIEW_SECRET>` pokazuje drafty do
   akceptacji.
3. Po kliknieciu "Zaakceptuj i opublikuj" system zmienia briefing na
   `published`.
4. Publiczna strona zaczyna widziec briefing, bo web app renderuje tylko
   `published`.
5. Po publikacji system probuje utworzyc draft newslettera w Kit.
6. Newsletter nie jest wysylany automatycznie; w Kit pozostaje jako draft do
   dalszej decyzji.

## Env

```bash
US100_GENERATION_TARGET_STATUS=draft
US100_REVIEW_SECRET=<prywatny sekret do review>
NEXT_PUBLIC_APP_URL=https://<production-domain>

US100_NEWSLETTER_PROVIDER=kit
KIT_API_KEY=<kit-api-key>
KIT_EMAIL_TEMPLATE_ID=<optional-template-id>
KIT_BROADCAST_PUBLIC=false
KIT_SUBSCRIBER_FILTER=<optional-json-filter>
```

Jesli `US100_NEWSLETTER_PROVIDER` nie jest ustawione na `kit`, approval nadal
publikuje briefing na stronie, ale pomija tworzenie newslettera.

## Kit

Integracja korzysta z Kit API v4 `POST /v4/broadcasts`.

Tworzony jest broadcast draft:

- `send_at: null`,
- `subject`: headline briefingu,
- `preview_text`: deck briefingu,
- `content`: deterministyczny HTML z tego samego structured payload,
- `public`: zgodnie z `KIT_BROADCAST_PUBLIC`.

## Status

- Prywatna lista draftow jest w `/review`.
- Podglad draftu jest w `/review/[locale]/briefings/[slug]`.
- Publikacja idzie przez `POST /api/review/publish`.
- Wynik newslettera jest zapisywany w `render_artifacts` jako format
  `newsletter`.
