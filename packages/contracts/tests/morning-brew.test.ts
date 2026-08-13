import { describe, expect, it } from "vitest";

import { MorningBrewSchema } from "../src";

const sample = {
  schemaVersion: "0.1.0",
  language: "pl",
  date: "2026-08-13",
  slug: "2026-08-13-us100-morning-brew",
  status: "published",
  publishedAt: "2026-08-13T06:00:00.000Z",
  headline: "US100 pauses below resistance while participation stays thin",
  deck: "A fixture briefing for validating the product surface.",
  verdict: {
    stance: "mixed",
    conviction: "medium",
    summary: "The short thesis is not confirmed, but internals are not broad enough to dismiss it.",
    whyItMatters: "Index-level strength without broader participation is easier to reverse."
  },
  keySignal: {
    title: "Index strength is still narrow",
    observation: "Large-cap leaders hold the tape together while breadth lags.",
    whyItMatters: "Narrow rallies depend on fewer buyers and can unwind quickly when leaders pause.",
    impact: "short_thesis_strengthened",
    evidence: [{ label: "Breadth", value: "Lagging", sourceIds: ["fixture"] }]
  },
  sections: {
    priceAction: {
      title: "Price action",
      observation: "US100 remains near recent highs.",
      whyItMatters: "Failed continuation near highs would matter more than the level alone.",
      impact: "mixed",
      evidence: []
    },
    breadth: {
      title: "Breadth",
      observation: "Participation remains selective.",
      whyItMatters: "Weak participation makes new highs less durable.",
      impact: "short_thesis_strengthened",
      evidence: []
    },
    aiSemis: {
      title: "AI / semis",
      observation: "AI leaders remain the key support.",
      whyItMatters: "The index needs this group to keep absorbing valuation pressure.",
      impact: "unchanged",
      evidence: []
    },
    ratesFed: {
      title: "Rates / Fed",
      observation: "Rates are not giving a clear fresh impulse.",
      whyItMatters: "Without lower discount-rate pressure, multiple expansion has less help.",
      impact: "unchanged",
      evidence: []
    },
    volatility: {
      title: "Volatility",
      observation: "Volatility is contained.",
      whyItMatters: "Contained volatility delays forced de-risking.",
      impact: "short_thesis_weakened",
      evidence: []
    }
  },
  thesisScorecard: [
    {
      factor: "Breadth",
      signal: "short_thesis_strengthened",
      observation: "Participation lags.",
      whyItMatters: "A narrower rally has less support beneath the index."
    }
  ],
  whatChanged: [
    {
      label: "Leadership",
      trigger: "Watch whether mega-cap strength broadens.",
      whyItMatters: "Broadening would weaken the short thesis."
    }
  ],
  levelsToWatch: [
    {
      label: "Recent high",
      trigger: "Clean breakout with breadth confirmation.",
      whyItMatters: "A confirmed breakout would reduce the probability of a near-term reversal."
    }
  ],
  sources: [
    {
      id: "fixture",
      title: "Fixture data",
      publisher: "US100 Morning Brew",
      url: "https://example.com/fixture",
      observedAt: "2026-08-13T06:00:00.000Z"
    }
  ]
};

describe("MorningBrewSchema", () => {
  it("accepts a complete structured briefing", () => {
    expect(MorningBrewSchema.parse(sample)).toEqual(sample);
  });

  it("requires causal whyItMatters text for key signals", () => {
    const invalid = {
      ...sample,
      keySignal: {
        ...sample.keySignal,
        whyItMatters: ""
      }
    };

    expect(() => MorningBrewSchema.parse(invalid)).toThrow();
  });

  it("accepts English as a publication locale", () => {
    expect(MorningBrewSchema.parse({ ...sample, language: "en" }).language).toBe("en");
  });
});
