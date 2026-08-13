import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { listBriefingRecords, appLocales, formatDate, impactLabel } from "@/lib/briefings";
import {
  firstSearchParam,
  hasReviewAccess,
  reviewSessionCookieName
} from "@/lib/review-auth";

type ReviewPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function ReviewPage({ searchParams }: ReviewPageProps) {
  const query = await searchParams;
  const token = firstSearchParam(query.token);
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

  return (
    <main className="page">
      <section className="review-panel">
        <p className="eyebrow">Approval</p>
        <h1>Briefingi do akceptacji</h1>
        <p>
          Cron zapisuje nowe Morning Brews jako drafty. Dopiero po akceptacji rekord zmienia
          status na published i staje się widoczny na stronie.
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
      <form action="/api/review/logout" method="post">
        <button className="button-secondary" type="submit">
          Wyloguj
        </button>
      </form>
    </main>
  );
}
