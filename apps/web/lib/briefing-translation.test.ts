import { getLatestBriefing } from "@us100/research";
import { describe, expect, it } from "vitest";

import {
  canonicalWeeklySlug,
  selectPublishedPolishBriefing,
  translateBriefing,
  translationDraftSlug
} from "./briefing-translation";

describe("briefing translation slugs", () => {
  it("uses canonical weekly slugs when translating weekly reports", async () => {
    const daily = getLatestBriefing("pl");
    const weekly = {
      ...daily,
      slug: canonicalWeeklySlug(daily.date),
      weeklySummary: {
        evidence: daily.keySignal.evidence,
        keyChanges: daily.whatChanged,
        levelsToWatch: daily.levelsToWatch,
        periodEnd: daily.date,
        periodStart: "2026-08-09",
        thesisSignals: daily.thesisScorecard,
        title: "Tygodniowe podsumowanie tezy short",
        verdict: daily.verdict
      }
    };

    const translated = await translateBriefing(weekly, "en", {
      env: {
        US100_GENERATION_PROVIDER: "fixture"
      }
    });

    expect(translated.slug).toBe(canonicalWeeklySlug(daily.date));
    expect(translationDraftSlug(daily.date, "en", "weekly")).toBe(
      `${canonicalWeeklySlug(daily.date)}-en-translation`
    );
  });

  it("selects a published weekly PL source when daily and weekly share the same date", () => {
    const daily = getLatestBriefing("pl");
    const weekly = {
      ...daily,
      slug: canonicalWeeklySlug(daily.date),
      weeklySummary: {
        evidence: daily.keySignal.evidence,
        keyChanges: daily.whatChanged,
        levelsToWatch: daily.levelsToWatch,
        periodEnd: daily.date,
        periodStart: "2026-08-09",
        thesisSignals: daily.thesisScorecard,
        title: "Tygodniowe podsumowanie tezy short",
        verdict: daily.verdict
      }
    };

    const selected = selectPublishedPolishBriefing(
      [
        {
          briefing: daily,
          id: "daily",
          language: "pl",
          publishedAt: daily.publishedAt,
          slug: daily.slug,
          status: "published"
        },
        {
          briefing: weekly,
          id: "weekly",
          language: "pl",
          publishedAt: weekly.publishedAt,
          slug: weekly.slug,
          status: "published"
        }
      ],
      {
        date: daily.date,
        reportType: "weekly"
      }
    );

    expect(selected?.slug).toBe(canonicalWeeklySlug(daily.date));
  });
});
