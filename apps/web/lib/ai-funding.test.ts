import { describe, expect, it } from "vitest";

import { createPublicOnlyAiFundingFallback } from "./ai-funding";

describe("AI funding web fallback", () => {
  it("renders unavailable public debt-demand fields as N/A", () => {
    const dashboard = createPublicOnlyAiFundingFallback(
      new Date("2026-08-18T08:00:00.000Z")
    );

    expect(dashboard.score.state).toBe("insufficient_data");
    expect(dashboard.metrics.find((metric) => metric.label === "Orderbook coverage")?.current).toBe(
      "N/A"
    );
    expect(dashboard.metrics.find((metric) => metric.label === "New issue concession")?.current).toBe(
      "N/A"
    );
  });

  it("localizes generated fallback copy for Polish", () => {
    const dashboard = createPublicOnlyAiFundingFallback(
      new Date("2026-08-18T08:00:00.000Z"),
      "pl"
    );

    expect(dashboard.interpretation).toContain("Publiczne dane");
    expect(dashboard.events[0]?.title).toContain("kontrola następnej aktualizacji SEC/IR");
    expect(dashboard.events[0]?.watchFields).toContain("raportowany capex");
    expect(dashboard.dataSources[0]?.source).toContain("Brak publicznie załadowanej metryki");
  });
});
