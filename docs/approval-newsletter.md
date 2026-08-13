# Approval + Newsletter

Etap 5 dodaje human-in-the-loop przed publikacja i newsletterem.

## Przeplyw

1. Cron generuje Morning Brew jako `draft`.
2. Prywatny ekran `/review/login` wysyla link logowania albo kod na dozwolony
   adres e-mail.
3. Po kliknieciu linku albo wpisaniu kodu aplikacja zapisuje sesje redakcyjna
   w cookie.
4. Prywatny ekran `/review` pokazuje drafty do akceptacji.
5. Po kliknieciu "Zaakceptuj i opublikuj" system zmienia briefing na
   `published`.
6. Publiczna strona zaczyna widziec briefing, bo web app renderuje tylko
   `published`.
7. Po publikacji system probuje utworzyc draft newslettera w Kit.
8. Newsletter nie jest wysylany automatycznie; w Kit pozostaje jako draft do
   dalszej decyzji.

## Env

```bash
US100_GENERATION_TARGET_STATUS=draft
US100_REVIEW_SECRET=<prywatny sekret do review>
US100_REVIEW_EMAILS=<email-1,email-2>
SUPABASE_ANON_KEY=<supabase-anon-key>
NEXT_PUBLIC_APP_URL=https://<production-domain>

US100_NEWSLETTER_PROVIDER=kit
KIT_API_KEY=<kit-api-key>
KIT_EMAIL_TEMPLATE_ID=<optional-template-id>
KIT_BROADCAST_PUBLIC=false
KIT_SUBSCRIBER_FILTER=<optional-json-filter>
```

`US100_REVIEW_EMAILS` ogranicza, kto moze dostac kod logowania do panelu
redakcyjnego.

## Supabase Auth URL configuration

W Supabase trzeba ustawic:

- Site URL: `https://www.theguy2b.com`
- Redirect URLs: `https://www.theguy2b.com/**`

Aplikacja przekazuje do Supabase redirect:

```txt
https://www.theguy2b.com/review/auth-callback
```

Jesli Supabase nadal wysyla link do `http://localhost:3000`, oznacza to, ze
URL Configuration w Supabase nadal wskazuje na lokalny adres albo redirect URL
nie jest na allowliscie.

Dodatkowo aplikacja ma globalny handler fragmentu auth. Jesli Supabase zwroci
uzytkownika na dowolna strone, np. `/pl#access_token=...`, web app przechwyci
token, ustawi sesje review i przekieruje do `/review`.

Typowe problemy logowania:

- brak `SUPABASE_ANON_KEY` w Vercel,
- wpisany e-mail nie znajduje sie w `US100_REVIEW_EMAILS`,
- Supabase Auth / Email nie ma wlaczonej wysylki OTP,
- ponowna wysylka kodu za szybko po poprzedniej probie.

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

- Logowanie redakcyjne jest w `/review/login`.
- Prywatna lista draftow jest w `/review`.
- Podglad draftu jest w `/review/[locale]/briefings/[slug]`.
- Publikacja idzie przez `POST /api/review/publish`.
- Wynik newslettera jest zapisywany w `render_artifacts` jako format
  `newsletter`.
