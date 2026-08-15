import { getLatestBriefing } from "@us100/research";
import { describe, expect, it } from "vitest";

import { briefingReportType, canonicalBriefingSlug } from "./briefings";

describe("briefing helpers", () => {
  it("builds canonical slugs for daily and weekly reports", () => {
    expect(canonicalBriefingSlug("2026-08-15", "daily")).toBe(
      "2026-08-15-us100-morning-brew"
    );
    expect(canonicalBriefingSlug("2026-08-15", "weekly")).toBe(
      "2026-08-15-us100-weekly-short-thesis"
    );
  });

  it("detects weekly reports from weeklySummary", () => {
    const daily = getLatestBriefing("pl");
    const weekly = {
      ...daily,
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

    expect(briefingReportType(daily)).toBe("daily");
    expect(briefingReportType(weekly)).toBe("weekly");
  });
});
