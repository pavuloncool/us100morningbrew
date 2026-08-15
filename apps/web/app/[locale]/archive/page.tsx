import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  briefingReportType,
  formatDate,
  impactLabel,
  isAppLocale,
  isBriefingArchiveFilter,
  listBriefingsByReportType,
  uiCopy,
  type BriefingArchiveFilter
} from "@/lib/briefings";

export const metadata: Metadata = {
  title: "Archive"
};

type ArchivePageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function filterLabel(filter: BriefingArchiveFilter, copy: typeof uiCopy.pl | typeof uiCopy.en): string {
  switch (filter) {
    case "daily":
      return copy.archiveFilterDaily;
    case "weekly":
      return copy.archiveFilterWeekly;
    case "all":
      return copy.archiveFilterAll;
  }
}

export default async function LocaleArchivePage({ params, searchParams }: ArchivePageProps) {
  const { locale } = await params;
  if (!isAppLocale(locale)) {
    notFound();
  }

  const query = await searchParams;
  const rawType = firstSearchParam(query.type);
  const activeFilter: BriefingArchiveFilter =
    rawType && isBriefingArchiveFilter(rawType) ? rawType : "all";
  const filters = ["all", "daily", "weekly"] as const satisfies readonly BriefingArchiveFilter[];
  const briefings = await listBriefingsByReportType(locale, activeFilter);
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
        <div className="filter-controls" aria-label={copy.archive}>
          {filters.map((filter) => (
            <a
              aria-current={activeFilter === filter ? "page" : undefined}
              data-active={activeFilter === filter}
              href={`/${locale}/archive?type=${filter}`}
              key={filter}
            >
              {filterLabel(filter, copy)}
            </a>
          ))}
        </div>
        <ul className="archive-items">
          {briefings.map((briefing) => (
            <li key={briefing.slug}>
              <a href={`/${locale}/briefings/${briefing.slug}`}>
                <span className="eyebrow">
                  {formatDate(briefing.date, locale)} /{" "}
                  {briefingReportType(briefing) === "weekly"
                    ? copy.weeklyReport
                    : copy.dailyReport}
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
