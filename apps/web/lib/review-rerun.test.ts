import { describe, expect, it } from "vitest";

import { createRerunEnv, parseRerunMode, rerunOptions } from "./review-rerun";

describe("review rerun modes", () => {
  it("keeps the quick rerun source-limited", () => {
    const env = createRerunEnv("quick", {
      US100_BUDGET_MAX_REQUESTS: "30",
      US100_BUDGET_NEWS_RSS_ENABLED: "true"
    });

    expect(env.US100_BUDGET_MAX_REQUESTS).toBe("15");
    expect(env.US100_BUDGET_NEWS_RSS_ENABLED).toBe("false");
  });

  it("uses the full budget source model for full reruns", () => {
    const env = createRerunEnv("full", {
      OPENAI_MAX_OUTPUT_TOKENS: "6500",
      US100_BUDGET_MAX_REQUESTS: "30",
      US100_BUDGET_NEWS_RSS_ENABLED: "true",
      US100_BUDGET_REQUEST_TIMEOUT_MS: "8000"
    });

    expect(env.US100_BUDGET_MAX_REQUESTS).toBe("30");
    expect(env.US100_BUDGET_NEWS_RSS_ENABLED).toBe("true");
    expect(env.US100_BUDGET_REQUEST_TIMEOUT_MS).toBe("8000");
  });

  it("uses separate idempotency and slug scopes for manual modes", () => {
    expect(rerunOptions("quick")).toMatchObject({
      idempotencyScope: "manual-quick",
      slugSuffix: "quick-test"
    });
    expect(rerunOptions("full")).toMatchObject({
      idempotencyScope: "manual-full",
      minEvidenceSources: 8,
      slugSuffix: "full-research-test"
    });
  });

  it("falls back to quick mode for unknown form values", () => {
    expect(parseRerunMode("full")).toBe("full");
    expect(parseRerunMode("unknown")).toBe("quick");
  });
});
