import { describe, expect, it } from "vitest";

import { AiFundingDashboardSchema, AiFundingMetricSourceSchema } from "../src";

const source = AiFundingMetricSourceSchema.parse({
  completeness: "complete",
  confidence: "high",
  lastUpdated: "2026-08-18T08:00:00.000Z",
  source: "Fixture public source",
  sourceTimestamp: "2026-08-18T08:00:00.000Z",
  sourceType: "derived",
  sourceUrl: "https://example.com/source"
});

describe("AiFundingDashboardSchema", () => {
  it("validates a public-only dashboard payload with unavailable components", () => {
    const dashboard = AiFundingDashboardSchema.parse({
      alerts: [],
      asOf: "2026-08-18T08:00:00.000Z",
      dataSources: [source],
      events: [],
      interpretation: "Funding stress is a regime warning, not a timing signal.",
      issuerCards: [
        {
          capexGuidanceChange: "N/A",
          creditSpread: "62 bp",
          fcfTrend: "up",
          issuerId: "msft",
          latestConcession: "N/A",
          latestIssueCoverage: "N/A",
          name: "Microsoft",
          nextEarningsDate: "N/A",
          ticker: "MSFT",
          twentyDaySpreadChange: "+11 bp"
        }
      ],
      metrics: [
        {
          current: "62 bp",
          label: "Credit spread",
          oneMonthAgo: "51 bp",
          source,
          threeMonthsAgo: "N/A",
          trend: "up"
        }
      ],
      schemaVersion: "0.1.0",
      score: {
        asOf: "2026-08-18T08:00:00.000Z",
        availableMaxScore: 0,
        components: [
          {
            label: "Orderbook coverage",
            metric: "N/A",
            score: null,
            source: { ...source, completeness: "unavailable" },
            unavailableReason: "Not publicly disclosed."
          }
        ],
        fullMaxScore: 12,
        state: "insufficient_data",
        totalScore: 0
      }
    });

    expect(dashboard.score.components[0]?.score).toBeNull();
  });
});
