import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  formatDate,
  impactLabel,
  isAppLocale,
  listBriefingsByReportType,
  uiCopy
} from "@/lib/briefings";

export const metadata: Metadata = {
  title: "Weekly reports"
};

type WeeklyPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleWeeklyPage({ params }: WeeklyPageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }

  const briefings = await listBriefingsByReportType(locale, "weekly");
  const copy = uiCopy[locale];

  return (
    <div className="page">
      <section className="briefing-hero" aria-labelledby="weekly-title">
        <div className="hero-copy">
          <p className="eyebrow">{copy.reportOfWeek}</p>
          <h1 id="weekly-title">{copy.weeklyTitle}</h1>
          <p className="deck">{copy.weeklyDescription}</p>
        </div>
      </section>

      <section className="archive-list" aria-label={copy.weeklyTitle}>
        <ul className="archive-items">
          {briefings.map((briefing) => (
            <li key={briefing.slug}>
              <a href={`/${locale}/briefings/${briefing.slug}`}>
                <span className="eyebrow">
                  {formatDate(briefing.date, locale)} / {copy.weeklyReport}
                </span>
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
