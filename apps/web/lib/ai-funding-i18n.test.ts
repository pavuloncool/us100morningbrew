import { describe, expect, it } from "vitest";

import { createPublicOnlyAiFundingFallback } from "./ai-funding";
import {
  aiFundingCompletenessLabel,
  aiFundingConfidenceLabel,
  aiFundingMetricLabel,
  aiFundingSourceTitle,
  aiFundingSourceTypeLabel,
  aiFundingStateLabel
} from "./ai-funding-i18n";

describe("AI funding i18n", () => {
  it("localizes Polish fallback dashboard data and labels", () => {
    const dashboard = createPublicOnlyAiFundingFallback(
      new Date("2026-08-18T08:00:00.000Z"),
      "pl"
    );
    const renderedText = [
      dashboard.interpretation,
      aiFundingStateLabel(dashboard.score.state, "pl"),
      ...dashboard.metrics.map((metric) => aiFundingMetricLabel(metric, "pl")),
      ...dashboard.dataSources.map((source) => aiFundingSourceTitle(source, "pl")),
      ...dashboard.dataSources.map((source) => aiFundingSourceTypeLabel(source.sourceType, "pl")),
      ...dashboard.dataSources.map((source) => aiFundingCompletenessLabel(source.completeness, "pl")),
      ...dashboard.dataSources.map((source) => aiFundingConfidenceLabel(source.confidence, "pl")),
      ...dashboard.events.map((event) => event.title),
      ...dashboard.events.flatMap((event) => event.watchFields)
    ].join(" ");

    expect(renderedText).toContain("BRAK WYSTARCZAJĄCYCH DANYCH");
    expect(renderedText).toContain("Spread kredytowy");
    expect(renderedText).toContain("Popyt na emisje");
    expect(renderedText).toContain("Brak publicznie załadowanej metryki");
    expect(renderedText).toContain("kontrola następnej aktualizacji SEC/IR");
    expect(renderedText).toContain("niedostępne");

    expect(renderedText).not.toContain("Funding stress");
    expect(renderedText).not.toContain("Public-only");
    expect(renderedText).not.toContain("Credit spread");
    expect(renderedText).not.toContain("Orderbook coverage");
    expect(renderedText).not.toContain("INSUFFICIENT DATA");
    expect(renderedText).not.toContain("next SEC/IR update check");
  });

  it("keeps English fallback dashboard labels for the English route", () => {
    const dashboard = createPublicOnlyAiFundingFallback(
      new Date("2026-08-18T08:00:00.000Z"),
      "en"
    );

    expect(aiFundingStateLabel(dashboard.score.state, "en")).toBe("INSUFFICIENT DATA");
    expect(aiFundingMetricLabel(dashboard.metrics[0]!, "en")).toBe("Credit spread");
    expect(aiFundingMetricLabel(dashboard.metrics[1]!, "en")).toBe("Orderbook coverage");
    expect(dashboard.events[0]?.title).toContain("next SEC/IR update check");
  });
});
