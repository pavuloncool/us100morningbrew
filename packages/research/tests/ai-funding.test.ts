import { describe, expect, it } from "vitest";

import {
  buildAiFundingDashboard,
  creditSpreadBp,
  defaultAiFundingBonds,
  defaultAiFundingIssuers,
  median,
  nearestTreasuryYield,
  scoreCreditSpreadTrend,
  scoreNewIssueConcession,
  scoreOrderbookCoverage
} from "../src";

const source = {
  completeness: "complete" as const,
  confidence: "high" as const,
  lastUpdated: "2026-08-18T08:00:00.000Z",
  source: "Recorded public source",
  sourceTimestamp: "2026-08-18T08:00:00.000Z",
  sourceType: "finra_trace" as const,
  sourceUrl: "https://example.com/public"
};

describe("AI funding calculations", () => {
  it("calculates credit spread in basis points", () => {
    expect(creditSpreadBp(5.32, 4.7)).toBe(62);
    expect(creditSpreadBp(null, 4.7)).toBeNull();
  });

  it("uses median for aggregate spread index", () => {
    expect(median([118, 62, 74, 86, 69])).toBe(74);
    expect(median([])).toBeNull();
  });

  it("matches the nearest Treasury tenor", () => {
    const match = nearestTreasuryYield("10Y", [
      { date: "2026-08-18", source, tenor: "5Y", yield: 4.1 },
      { date: "2026-08-18", source, tenor: "10Y", yield: 4.7 }
    ]);

    expect(match?.yield).toBe(4.7);
  });

  it("scores public-only stress components without filling missing values", () => {
    expect(scoreCreditSpreadTrend(21)).toBe(3);
    expect(scoreOrderbookCoverage(null)).toBeNull();
    expect(scoreOrderbookCoverage(1.8)).toBe(3);
    expect(scoreNewIssueConcession(null)).toBeNull();
    expect(scoreNewIssueConcession(15)).toBe(2);
  });

  it("builds a dashboard with N/A debt-demand metrics when public data is absent", () => {
    const dashboard = buildAiFundingDashboard({
      asOf: "2026-08-18T08:00:00.000Z",
      bondObservations: [
        {
          bondId: defaultAiFundingBonds[0]?.id ?? "",
          corporateYield: 5.32,
          observedAt: "2026-08-18T08:00:00.000Z",
          price: 98.1,
          source,
          tradeDate: "2026-08-18",
          volumeUsd: null
        }
      ],
      bonds: defaultAiFundingBonds,
      debtIssues: [],
      events: [],
      issuers: defaultAiFundingIssuers,
      previousSpreads: [
        {
          benchmarkTreasuryYield: 4.7,
          bondId: defaultAiFundingBonds[0]?.id ?? "",
          corporateYield: 5.32,
          issuerId: "msft",
          source,
          spreadBp: 62,
          spreadChange1d: 2,
          spreadChange5d: 5,
          spreadChange20d: 21,
          timestamp: "2026-08-18T08:00:00.000Z"
        }
      ],
      quarterlyMetrics: [],
      treasuryYields: [{ date: "2026-08-18", source, tenor: "10Y", yield: 4.7 }]
    });

    expect(dashboard.metrics.find((metric) => metric.id === "orderbook_coverage")?.current).toBe("N/A");
    expect(dashboard.score.components.map((component) => component.id)).toEqual([
      "credit_spread_trend",
      "orderbook_coverage",
      "new_issue_concession",
      "capex_cashflow_pressure"
    ]);
    expect(dashboard.score.availableMaxScore).toBe(3);
    expect(dashboard.score.state).toBe("insufficient_data");
  });
});
