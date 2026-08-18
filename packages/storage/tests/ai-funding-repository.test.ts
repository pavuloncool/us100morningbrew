import { describe, expect, it } from "vitest";
import { AiFundingDashboardSchema, AiFundingMetricSourceSchema } from "@us100/contracts";

import {
  createAiFundingRepositoryFromEnv,
  createSupabaseRestAiFundingRepository,
  type AiFundingRepository
} from "../src";

const source = AiFundingMetricSourceSchema.parse({
  completeness: "partial",
  confidence: "medium",
  lastUpdated: "2026-08-18T08:00:00.000Z",
  source: "Public source fixture",
  sourceTimestamp: "2026-08-18T08:00:00.000Z",
  sourceType: "derived",
  sourceUrl: "https://example.com/source"
});

const dashboard = AiFundingDashboardSchema.parse({
  alerts: [],
  asOf: "2026-08-18T08:00:00.000Z",
  dataSources: [source],
  events: [],
  interpretation: "Funding stress is a regime warning, not a timing signal.",
  issuerCards: [],
  metrics: [],
  schemaVersion: "0.1.0",
  score: {
    asOf: "2026-08-18T08:00:00.000Z",
    availableMaxScore: 0,
    components: [],
    fullMaxScore: 12,
    state: "insufficient_data",
    totalScore: 0
  }
});

const fallbackRepository: AiFundingRepository = {
  async getLatestDashboard() {
    return dashboard;
  },
  async saveDashboard() {
    return dashboard;
  }
};

describe("AI funding storage repository", () => {
  it("uses fallback when Supabase env is missing", async () => {
    const repository = createAiFundingRepositoryFromEnv(fallbackRepository, {});
    await expect(repository.getLatestDashboard()).resolves.toEqual(dashboard);
  });

  it("throws when Supabase is required but env is incomplete", () => {
    expect(() =>
      createAiFundingRepositoryFromEnv(fallbackRepository, { US100_STORAGE_PROVIDER: "supabase" })
    ).toThrow("SUPABASE_URL");
  });

  it("reads and validates latest dashboard payload from Supabase", async () => {
    const requests: string[] = [];
    const repository = createSupabaseRestAiFundingRepository({
      apiKey: "test-key",
      url: "https://example.supabase.co",
      fetch: async (input) => {
        requests.push(String(input));
        return new Response(
          JSON.stringify([
            {
              as_of: dashboard.asOf,
              available_max_score: dashboard.score.availableMaxScore,
              completeness: source.completeness,
              confidence: source.confidence,
              dashboard_payload: dashboard,
              full_max_score: 12,
              id: "score-1",
              last_updated: source.lastUpdated,
              score: dashboard.score.totalScore,
              source: source.source,
              source_timestamp: source.sourceTimestamp,
              source_type: source.sourceType,
              source_url: source.sourceUrl,
              stress_state: dashboard.score.state
            }
          ]),
          { headers: { "Content-Type": "application/json" }, status: 200 }
        );
      }
    });

    await expect(repository.getLatestDashboard()).resolves.toEqual(dashboard);
    expect(requests[0]).toContain("ai_funding_stress_scores");
    expect(requests[0]).toContain("order=as_of.desc");
  });

  it("saves dashboard snapshots through Supabase upsert", async () => {
    const requests: Array<{ body?: unknown; method: string; url: string }> = [];
    const repository = createSupabaseRestAiFundingRepository({
      apiKey: "test-key",
      url: "https://example.supabase.co",
      fetch: async (input, init) => {
        requests.push({
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
          method: init?.method ?? "GET",
          url: String(input)
        });
        return new Response(
          JSON.stringify([
            {
              as_of: dashboard.asOf,
              available_max_score: dashboard.score.availableMaxScore,
              completeness: source.completeness,
              confidence: source.confidence,
              dashboard_payload: dashboard,
              full_max_score: 12,
              id: "score-1",
              last_updated: source.lastUpdated,
              score: dashboard.score.totalScore,
              source: source.source,
              source_timestamp: source.sourceTimestamp,
              source_type: source.sourceType,
              source_url: source.sourceUrl,
              stress_state: dashboard.score.state
            }
          ]),
          { headers: { "Content-Type": "application/json" }, status: 200 }
        );
      }
    });

    await expect(repository.saveDashboard(dashboard)).resolves.toEqual(dashboard);
    expect(requests[0]?.method).toBe("POST");
    expect(requests[0]?.url).toContain("on_conflict=as_of");
    expect(requests[0]?.body).toMatchObject({
      as_of: dashboard.asOf,
      dashboard_payload: dashboard,
      score: 0,
      stress_state: "insufficient_data"
    });
  });
});
