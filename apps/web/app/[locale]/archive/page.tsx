import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { formatDate, impactLabel, isAppLocale, listBriefings, uiCopy } from "@/lib/briefings";

export const metadata: Metadata = {
  title: "Archive"
};

type ArchivePageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleArchivePage({ params }: ArchivePageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }

  const briefings = await listBriefings(locale);
  const copy = uiCopy[locale];

  return (
    <div className="page">
      <section className="briefing-hero" aria-labelledby="archive-title">
        <div className="hero-copy">
          <p className="eyebrow">{copy.archive}</p>
          <h1 id="archive-title">{copy.archiveTitle}</h1>
          <p className="deck">{copy.archiveDescription}</p>
        </div>
      </section>

      <section className="archive-list" aria-label={copy.archiveTitle}>
        <ul className="archive-items">
          {briefings.map((briefing) => (
            <li key={briefing.slug}>
              <a href={`/${locale}/briefings/${briefing.slug}`}>
                <span className="eyebrow">{formatDate(briefing.date, locale)}</span>
                <strong>{briefing.headline}</strong>
                <p>{briefing.deck}</p>
                <span className="tone" data-impact={briefing.verdict.stance}>
                  {impactLabel(briefing.verdict.stance, locale)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
