import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  listBriefingRecords,
  appLocales,
  formatDate,
  impactLabel,
  listResearchRuns,
  type AppLocale
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

const staleRunningRunMs = 5 * 60 * 1000;

function isStaleRunningRun(run: { startedAt: string; status: string }): boolean {
  if (run.status !== "running") {
    return false;
  }
  return Date.now() - new Date(run.startedAt).getTime() > staleRunningRunMs;
}

function runStatusLabel(status: string, stale = false): string {
  if (stale) {
    return "Przerwany";
  }
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

function formatSeconds(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return `${(value / 1000).toFixed(1)}s`;
}

function formatRunDiagnostics(metrics: Record<string, unknown>): string | null {
  const timings =
    typeof metrics.timingsMs === "object" && metrics.timingsMs !== null
      ? (metrics.timingsMs as Record<string, unknown>)
      : null;

  const parts: string[] = [];

  if (metrics.runSource === "review-full") {
    parts.push("tryb: pełny research");
  } else if (metrics.runSource === "review-weekly-full") {
    parts.push("tryb: tygodniowy research");
  } else if (metrics.runSource === "review-quick") {
    parts.push("tryb: szybki test");
  } else if (metrics.runSource === "vercel-cron") {
    parts.push("tryb: cron");
  } else if (metrics.runSource === "weekly-cron") {
    parts.push("tryb: tygodniowy cron");
  }
  if (metrics.translatedFromLocale === "pl") {
    parts.push("EN z tłumaczenia PL");
  }

  if (timings) {
    const generationLabel = metrics.translatedFromLocale === "pl" ? "tłumaczenie" : "OpenAI";
    parts.push(
      ...[
        ["research", formatSeconds(timings.collect)],
        ["analiza", formatSeconds(timings.analyze)],
        [generationLabel, formatSeconds(timings.generate)],
        ["zapis", formatSeconds(timings.save)],
        ["razem", formatSeconds(timings.total)]
      ]
        .filter((item): item is [string, string] => item[1] !== null)
        .map(([label, value]) => `${label}: ${value}`)
    );
  }

  if (typeof metrics.evidenceSources === "number") {
    parts.push(`źródła: ${metrics.evidenceSources}`);
  }
  if (typeof metrics.evidenceSnapshots === "number") {
    parts.push(`snapshoty: ${metrics.evidenceSnapshots}`);
  }
  if (typeof metrics.sourceBreakdown === "object" && metrics.sourceBreakdown !== null) {
    const breakdown = metrics.sourceBreakdown as Record<string, unknown>;
    const sourceParts = ["stooq", "fred", "news", "other"]
      .map((key) => (typeof breakdown[key] === "number" ? `${key}: ${breakdown[key]}` : null))
      .filter((item): item is string => item !== null);
    if (sourceParts.length > 0) {
      parts.push(`koszyki: ${sourceParts.join(", ")}`);
    }
  }

  return parts.length > 0 ? parts.join(" / ") : null;
}

function formatRunIssues(metrics: Record<string, unknown>): string | null {
  const issues = Array.isArray(metrics.issues) ? metrics.issues : [];
  const messages = issues
    .map((issue) => {
      if (typeof issue !== "object" || issue === null || !("message" in issue)) {
        return null;
      }
      const message = (issue as { message?: unknown }).message;
      return typeof message === "string" ? message : null;
    })
    .filter((message): message is string => message !== null);

  return messages.length > 0 ? `Quality gates: ${messages.join(" | ")}` : null;
}

function formatSnapshotErrors(metrics: Record<string, unknown>): string | null {
  const errors = Array.isArray(metrics.snapshotErrors) ? metrics.snapshotErrors : [];
  const messages = errors
    .map((error) => {
      if (typeof error !== "object" || error === null) {
        return null;
      }
      const item = error as { error?: unknown; label?: unknown; source?: unknown };
      if (typeof item.error !== "string" || typeof item.source !== "string") {
        return null;
      }
      const label = typeof item.label === "string" ? `${item.label}: ` : "";
      return `${item.source} - ${label}${item.error}`;
    })
    .filter((message): message is string => message !== null);

  return messages.length > 0 ? `Błędy źródeł: ${messages.join(" | ")}` : null;
}

function rerunMessage(status: string | undefined): string | null {
  switch (status) {
    case "completed":
      return "Ponowne uruchomienie zakończone. Sprawdź sekcję Drafty oraz Ostatnie uruchomienia.";
    case "failed":
      return "Ponowne uruchomienie zakończyło się błędem. Szczegóły są w sekcji Ostatnie uruchomienia.";
    case "skipped":
      return "Ponowne uruchomienie zostało pominięte, bo dzisiejszy briefing jest już w toku albo został zapisany.";
    default:
      return null;
  }
}

function translationMessage(status: string | undefined): string | null {
  switch (status) {
    case "completed":
      return "Wersja EN została utworzona z opublikowanego PL i opublikowana równolegle.";
    case "failed":
      return "Nie udało się utworzyć wersji EN z opublikowanego PL. Sprawdź logi lub spróbuj ponownie.";
    default:
      return null;
  }
}

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const query = await searchParams;
  const token = firstSearchParam(query.token);
  const message = rerunMessage(firstSearchParam(query.rerun));
  const translateMessage = translationMessage(firstSearchParam(query.translate));
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
        {translateMessage ? <p className="form-success">{translateMessage}</p> : null}
        <div className="review-actions review-actions-start">
          <form action="/api/review/rerun" method="post">
            {token ? <input name="token" type="hidden" value={token} /> : null}
            <input name="locales" type="hidden" value="pl" />
            <input name="mode" type="hidden" value="quick" />
            <button className="button-primary" type="submit">
              Szybki test PL
            </button>
          </form>
          <form action="/api/review/rerun" method="post">
            {token ? <input name="token" type="hidden" value={token} /> : null}
            <input name="locales" type="hidden" value="pl" />
            <input name="mode" type="hidden" value="full" />
            <button className="button-secondary" type="submit">
              Pełny research PL
            </button>
          </form>
          <form action="/api/review/rerun" method="post">
            {token ? <input name="token" type="hidden" value={token} /> : null}
            <input name="locales" type="hidden" value="pl,en" />
            <input name="mode" type="hidden" value="full" />
            <input name="reportType" type="hidden" value="weekly" />
            <button className="button-secondary" type="submit">
              Tygodniowy research PL+EN
            </button>
          </form>
          <form action="/api/review/backfill-en" method="post">
            {token ? <input name="token" type="hidden" value={token} /> : null}
            <button className="button-secondary" type="submit">
              Utwórz EN z opublikowanego PL
            </button>
          </form>
        </div>
        <p className="review-actions-note">
          Szybki test ogranicza źródła, żeby sprawdzić sam przepływ. Pełny research PL używa
          pełnego modelu źródeł budget pipeline: ceny, FRED i RSS/news, jeśli są skonfigurowane.
          EN z opublikowanego PL tłumaczy zatwierdzoną publikację bez ponownego researchu.
        </p>
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
            {recentRuns.map((run) => {
              const stale = isStaleRunningRun(run);
              const diagnostics = formatRunDiagnostics(run.metrics);
              const issueDiagnostics = formatRunIssues(run.metrics);
              const sourceErrors = formatSnapshotErrors(run.metrics);
              return (
                <li key={run.id}>
                  <div>
                    <strong>
                      {formatDate(run.runDate, run.language as AppLocale)} /{" "}
                      {run.language.toUpperCase()}
                    </strong>
                    <span>{formatRunTime(run.completedAt ?? run.startedAt)}</span>
                  </div>
                  <span className="tone" data-run-status={stale ? "failed" : run.status}>
                    {runStatusLabel(run.status, stale)}
                  </span>
                  {run.errorMessage ? <p>{run.errorMessage}</p> : null}
                  {diagnostics ? <p className="review-run-diagnostics">{diagnostics}</p> : null}
                  {issueDiagnostics ? (
                    <p className="review-run-diagnostics">{issueDiagnostics}</p>
                  ) : null}
                  {sourceErrors ? <p className="review-run-diagnostics">{sourceErrors}</p> : null}
                  {stale ? (
                    <p>
                      To uruchomienie prawdopodobnie zostało przerwane przez timeout Vercel.
                      Możesz uruchomić dzisiejszy briefing PL ponownie.
                    </p>
                  ) : null}
                </li>
              );
            })}
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
