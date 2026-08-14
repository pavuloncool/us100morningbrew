import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  listBriefingRecords,
  appLocales,
  formatDate,
  impactLabel,
  listResearchRuns
} from "@/lib/briefings";
import {
  firstSearchParam,
  hasReviewAccess,
  reviewSessionCookieName
} from "@/lib/review-auth";

type ReviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

function runStatusLabel(status: string): string {
  switch (status) {
    case "drafted":
      return "Draft zapisany";
    case "failed":
      return "Błąd";
    case "published":
      return "Opublikowany";
    case "running":
      return "W toku";
    case "queued":
      return "W kolejce";
    default:
      return status;
  }
}

function formatRunTime(value: string | null): string {
  if (!value) {
    return "Brak czasu zakończenia";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw"
  }).format(new Date(value));
}

function rerunMessage(status: string | undefined): string | null {
  switch (status) {
    case "completed":
      return "Ponowne uruchomienie zakończone. Sprawdź sekcję Drafty oraz Ostatnie uruchomienia.";
    case "failed":
      return "Ponowne uruchomienie zakończyło się błędem. Szczegóły są w sekcji Ostatnie uruchomienia.";
    case "skipped":
      return "Ponowne uruchomienie zostało pominięte.";
    default:
      return null;
  }
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const query = await searchParams;
  const token = firstSearchParam(query.token);
  const message = rerunMessage(firstSearchParam(query.rerun));
  const cookieStore = await cookies();
  const session = cookieStore.get(reviewSessionCookieName)?.value;

  if (!hasReviewAccess({ session, token })) {
    redirect("/review/login");
  }

  const draftsByLocale = await Promise.all(
    appLocales.map(async (locale) => ({
      drafts: await listBriefingRecords(locale, "draft"),
      locale
    }))
  );
  const allDrafts = draftsByLocale.flatMap(({ drafts, locale }) =>
    drafts.map((record) => ({ ...record, locale }))
  );
  const recentRuns = await listResearchRuns(10);

  return (
    <main className="page">
      <section className="review-panel">
        <p className="eyebrow">Approval</p>
        <h1>Briefingi do akceptacji</h1>
        <p>
          Cron zapisuje nowe Morning Brews jako drafty. Dopiero po akceptacji rekord zmienia
          status na published i staje się widoczny na stronie.
        </p>
        {message ? <p className="form-success">{message}</p> : null}
        <div className="review-actions review-actions-start">
          <form action="/api/review/rerun" method="post">
            {token ? <input name="token" type="hidden" value={token} /> : null}
            <input name="locales" type="hidden" value="pl" />
            <button className="button-primary" type="submit">
              Uruchom dzisiejszy briefing PL
            </button>
          </form>
          <form action="/api/review/rerun" method="post">
            {token ? <input name="token" type="hidden" value={token} /> : null}
            <input name="locales" type="hidden" value="pl,en" />
            <button className="button-secondary" type="submit">
              Uruchom PL + EN
            </button>
          </form>
        </div>
      </section>

      <section className="review-panel">
        <h2>Drafty</h2>
        {allDrafts.length === 0 ? (
          <p>Brak briefingów oczekujących na akceptację.</p>
        ) : (
          <ul className="review-list">
            {allDrafts.map((record) => (
              <li key={`${record.locale}:${record.slug}`}>
                <a
                  href={
                    token
                      ? `/review/${record.locale}/briefings/${record.slug}?token=${token}`
                      : `/review/${record.locale}/briefings/${record.slug}`
                  }
                >
                  <span className="eyebrow">
                    {record.locale.toUpperCase()} / {formatDate(record.briefing.date, record.locale)}
                  </span>
                  <strong>{record.briefing.headline}</strong>
                  <span className="tone" data-impact={record.briefing.verdict.stance}>
                    {impactLabel(record.briefing.verdict.stance, record.locale)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="review-panel">
        <h2>Ostatnie uruchomienia</h2>
        {recentRuns.length === 0 ? (
          <p>
            Brak zapisanej historii uruchomień. Jeśli cron faktycznie próbował dziś działać, to
            zatrzymał się przed wejściem do pipeline albo nie został uruchomiony przez Vercel.
          </p>
        ) : (
          <ul className="review-run-list">
            {recentRuns.map((run) => (
              <li key={run.id}>
                <div>
                  <strong>
                    {formatDate(run.runDate, run.language)} / {run.language.toUpperCase()}
                  </strong>
                  <span>{formatRunTime(run.completedAt ?? run.startedAt)}</span>
                </div>
                <span className="tone" data-run-status={run.status}>
                  {runStatusLabel(run.status)}
                </span>
                {run.errorMessage ? <p>{run.errorMessage}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
      <form action="/api/review/logout" method="post">
        <button className="button-secondary" type="submit">
          Wyloguj
        </button>
      </form>
    </main>
  );
}
