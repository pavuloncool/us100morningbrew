# Read-only inventory projektow referencyjnych

## Projekt A: neoneon

Lokalizacja: `/Users/pa/projects/neoneon/blog`

Charakter projektu:

- Next.js App Router.
- Deployment na Vercel.
- Supabase jako storage/CMS.
- `next-intl` i routing lokalizowany.
- Publiczny blog, archiwum, pojedyncze wpisy.
- Admin panel i Tiptap editor.

Elementy warte uzycia jako referencja:

- Struktura Next.js App Router.
- Metadata SEO i Open Graph.
- Publiczne strony wpisow i archiwum.
- Supabase server/client setup.
- Wzorzec permalinkow.
- Minimalna konfiguracja Vercel.

Elementy, ktorych nie warto kopiowac 1:1:

- Tiptap jako podstawowy format tresci.
- Admin CMS do recznego pisania artykulow.
- Komentarze i formularz kontaktowy.
- Schemat `articles`, bo Morning Brew potrzebuje danych analitycznych.
- Obecna stylistyka editorial jako cala warstwa wizualna.

## Projekt B: roastnbrew

Lokalizacja: `/Users/pa/projects/roastnbrew`

Charakter projektu:

- pnpm/turbo monorepo.
- Next.js web app.
- Osobne pakiety `contracts`, `design-system`, `database`, importer adapters.
- Zod schemas i kontrakty API.
- Fixture mode oraz repository abstraction.
- Rygorystyczne testy i statyczna polityka design systemu.

Elementy warte uzycia jako referencja:

- Monorepo z `apps/*` i `packages/*`.
- `packages/contracts` jako zrodlo prawdy dla typow i schematow.
- `packages/design-system` jako wzorzec tokenow CSS/TS.
- Web UI primitives: button, table, section, notices, page header.
- Testy kontraktowe i static-policy tests.
- Runtime adapter pattern: fixture vs real backend.

Elementy, ktorych nie warto kopiowac 1:1:

- Domenowe elementy kawowe.
- Operator/roaster application shell.
- Status labels powiazane z procesami roastnbrew.
- Caly workflow Supabase/importer, bo Morning Brew ma inny pipeline danych.
- Mobile app.

