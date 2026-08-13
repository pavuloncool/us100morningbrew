import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { BriefingView } from "@/components/briefing";
import {
  formatDate,
  getBriefingRecordBySlug,
  impactLabel,
  isAppLocale
} from "@/lib/briefings";
import {
  firstSearchParam,
  hasReviewAccess,
  reviewSessionCookieName
} from "@/lib/review-auth";

type ReviewBriefingPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export default async function ReviewBriefingPage({
  params,
  searchParams
}: ReviewBriefingPageProps) {
  const { locale, slug } = await params;
  const query = await searchParams;
  const token = firstSearchParam(query.token);
  const publishStatus = firstSearchParam(query.published);
  const newsletterStatus = firstSearchParam(query.newsletter);
  const cookieStore = await cookies();
  const session = cookieStore.get(reviewSessionCookieName)?.value;

  if (!isAppLocale(locale)) {
    notFound();
  }

  if (!hasReviewAccess({ session, token })) {
    return (
      <main className="page">
        <section className="review-panel">
          <p className="eyebrow">Review</p>
          <h1>Brak dostępu</h1>
          <p>
            <a href="/review/login">Zaloguj się, żeby zobaczyć ekran redakcyjny.</a>
          </p>
        </section>
      </main>
    );
  }

  const record = await getBriefingRecordBySlug(slug, locale, "any");
  if (!record) {
    notFound();
  }

  const briefing = record.briefing;
  const publicHref = `/${locale}/briefings/${slug}`;

  return (
    <main>
      <section className="review-bar" aria-label="Panel akceptacji">
        <div>
          <p className="eyebrow">
            Review / {locale.toUpperCase()} / {formatDate(briefing.date, locale)}
          </p>
          <h1>{record.status === "published" ? "Briefing opublikowany" : "Briefing do akceptacji"}</h1>
          <p>
            Status: <strong>{record.status}</strong> /{" "}
            <span className="tone" data-impact={briefing.verdict.stance}>
              {impactLabel(briefing.verdict.stance, locale)}
            </span>
          </p>
          {publishStatus === "1" ? (
            <p>
              Publikacja zakończona. Newsletter: <strong>{newsletterStatus ?? "unknown"}</strong>.
            </p>
          ) : null}
        </div>
        <div className="review-actions">
          <a className="button-secondary" href={token ? `/review?token=${token}` : "/review"}>
            Wróć do listy
          </a>
          <form action="/api/review/logout" method="post">
            <button className="button-secondary" type="submit">
              Wyloguj
            </button>
          </form>
          {record.status === "published" ? (
            <a className="button-primary" href={publicHref}>
              Zobacz publicznie
            </a>
          ) : (
            <form action="/api/review/publish" method="post">
              <input name="locale" type="hidden" value={locale} />
              <input name="slug" type="hidden" value={slug} />
              <input name="token" type="hidden" value={token ?? ""} />
              <button className="button-primary" type="submit">
                Zaakceptuj i opublikuj
              </button>
            </form>
          )}
        </div>
      </section>
      <BriefingView briefing={briefing} />
    </main>
  );
}
