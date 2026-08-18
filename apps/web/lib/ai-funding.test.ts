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
});
