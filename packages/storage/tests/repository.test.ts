import { describe, expect, it } from "vitest";
import { MorningBrewSchema } from "@us100/contracts";

import {
  createBriefingRepositoryFromEnv,
  createSupabaseRestResearchRunRepository,
  createSupabaseRestBriefingRepository,
  type BriefingRepository
} from "../src";

const sampleBriefing = MorningBrewSchema.parse({
  schemaVersion: "0.1.0",
  language: "pl",
  date: "2026-08-13",
  slug: "2026-08-13-us100-morning-brew",
  status: "published",
  publishedAt: "2026-08-13T06:00:00.000Z",
  headline: "US100 test",
  deck: "Fixture deck.",
  verdict: {
    stance: "mixed",
    conviction: "medium",
    summary: "Summary.",
    whyItMatters: "Reason."
  },
  keySignal: {
    title: "Signal",
    observation: "Observation.",
    whyItMatters: "Reason.",
    impact: "short_thesis_strengthened",
    evidence: [{ label: "Fixture", value: "Value", sourceIds: ["fixture"] }]
  },
  sections: {
    priceAction: {
      title: "Price action",
      observation: "Observation.",
      whyItMatters: "Reason.",
      impact: "mixed",
      evidence: []
    },
    breadth: {
      title: "Breadth",
      observation: "Observation.",
      whyItMatters: "Reason.",
      impact: "short_thesis_strengthened",
      evidence: []
    },
    aiSemis: {
      title: "AI / semis",
      observation: "Observation.",
      whyItMatters: "Reason.",
      impact: "unchanged",
      evidence: []
    },
    ratesFed: {
      title: "Rates / Fed",
      observation: "Observation.",
      whyItMatters: "Reason.",
      impact: "unchanged",
      evidence: []
    },
    volatility: {
      title: "Volatility",
      observation: "Observation.",
      whyItMatters: "Reason.",
      impact: "short_thesis_weakened",
      evidence: []
    }
  },
  thesisScorecard: [
    {
      factor: "Breadth",
      signal: "short_thesis_strengthened",
      observation: "Observation.",
      whyItMatters: "Reason."
    }
  ],
  whatChanged: [
    {
      label: "Breadth",
      trigger: "Trigger.",
      whyItMatters: "Reason."
    }
  ],
  levelsToWatch: [
    {
      label: "High",
      trigger: "Trigger.",
      whyItMatters: "Reason."
    }
  ],
  sources: [
    {
      id: "fixture",
      title: "Fixture",
      publisher: "US100 Morning Brew",
      url: "https://example.com/fixture",
      observedAt: "2026-08-13T06:00:00.000Z"
    }
  ]
});

const fallbackRepository: BriefingRepository = {
  async getBriefingRecordBySlug() {
    return {
      briefing: sampleBriefing,
      id: "briefing-1",
      language: sampleBriefing.language,
      publishedAt: sampleBriefing.publishedAt,
      slug: sampleBriefing.slug,
      status: sampleBriefing.status
    };
  },
  async getBriefingBySlug() {
    return sampleBriefing;
  },
  async getLatestBriefing() {
    return sampleBriefing;
  },
  async listBriefings() {
    return [sampleBriefing];
  },
  async listBriefingRecords() {
    return [
      {
        briefing: sampleBriefing,
        id: "briefing-1",
        language: sampleBriefing.language,
        publishedAt: sampleBriefing.publishedAt,
        slug: sampleBriefing.slug,
        status: sampleBriefing.status
      }
    ];
  },
  async publishBriefing() {
    return sampleBriefing;
  },
  async saveBriefing() {
    return sampleBriefing;
  },
  async saveRenderArtifact() {
    return {
      artifactPath: null,
      artifactUrl: null,
      briefingId: "briefing-1",
      createdAt: "2026-08-13T06:00:00.000Z",
      format: "newsletter",
      id: "artifact-1",
      language: "pl",
      metadata: {}
    };
  }
};

describe("storage repository", () => {
  it("uses the fixture fallback when Supabase env is missing", async () => {
    const repository = createBriefingRepositoryFromEnv(fallbackRepository, {});
    await expect(repository.getLatestBriefing("pl")).resolves.toEqual(sampleBriefing);
  });

  it("throws when Supabase is required but env is incomplete", () => {
    expect(() =>
      createBriefingRepositoryFromEnv(fallbackRepository, { US100_STORAGE_PROVIDER: "supabase" })
    ).toThrow("SUPABASE_URL");
  });

  it("reads and validates Supabase briefing payloads", async () => {
    const requests: string[] = [];
    const repository = createSupabaseRestBriefingRepository({
      apiKey: "test-key",
      url: "https://example.supabase.co",
      fetch: async (input) => {
        requests.push(String(input));
        return new Response(
          JSON.stringify([
            {
              id: "briefing-1",
              language: "pl",
              payload: sampleBriefing,
              published_at: sampleBriefing.publishedAt,
              slug: sampleBriefing.slug,
              status: sampleBriefing.status
            }
          ]),
          {
            headers: { "Content-Type": "application/json" },
            status: 200
          }
        );
      }
    });

    await expect(repository.getLatestBriefing("pl")).resolves.toEqual(sampleBriefing);
    expect(requests[0]).toContain("language=eq.pl");
    expect(requests[0]).toContain("status=eq.published");
  });

  it("publishes an existing Supabase briefing draft", async () => {
    const draftBriefing = {
      ...sampleBriefing,
      publishedAt: null,
      status: "draft" as const
    };
    const requests: Array<{ body?: unknown; method: string; url: string }> = [];
    const repository = createSupabaseRestBriefingRepository({
      apiKey: "test-key",
      url: "https://example.supabase.co",
      fetch: async (input, init) => {
        const url = String(input);
        requests.push({
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
          method: init?.method ?? "GET",
          url
        });

        if (init?.method === "PATCH") {
          return new Response(
            JSON.stringify([
              {
                payload: (requests.at(-1)?.body as { payload: unknown }).payload
              }
            ]),
            {
              headers: { "Content-Type": "application/json" },
              status: 200
            }
          );
        }

        if (url.includes("slug=neq.")) {
          return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" },
            status: 200
          });
        }

        return new Response(
          JSON.stringify([
            {
              id: "briefing-1",
              language: "pl",
              payload: draftBriefing,
              published_at: null,
              slug: draftBriefing.slug,
              status: "draft"
            }
          ]),
          {
            headers: { "Content-Type": "application/json" },
            status: 200
          }
        );
      }
    });

    const published = await repository.publishBriefing(
      "2026-08-13-us100-morning-brew",
      "pl",
      "2026-08-13T07:00:00.000Z"
    );

    expect(published.status).toBe("published");
    expect(published.publishedAt).toBe("2026-08-13T07:00:00.000Z");
    expect(requests.some((request) => request.method === "PATCH")).toBe(true);
  });

  it("archives older published briefings from the same date and language", async () => {
    const newerDraft = MorningBrewSchema.parse({
      ...sampleBriefing,
      publishedAt: null,
      slug: "2026-08-13-us100-morning-brew-full-research-test",
      status: "draft"
    });
    const olderPublished = MorningBrewSchema.parse({
      ...sampleBriefing,
      headline: "Older briefing",
      publishedAt: "2026-08-13T06:00:00.000Z",
      slug: "2026-08-13-us100-morning-brew",
      status: "published"
    });
    const requests: Array<{ body?: unknown; method: string; url: string }> = [];
    const repository = createSupabaseRestBriefingRepository({
      apiKey: "test-key",
      url: "https://example.supabase.co",
      fetch: async (input, init) => {
        const url = String(input);
        requests.push({
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
          method: init?.method ?? "GET",
          url
        });

        if (init?.method === "PATCH") {
          return new Response(
            JSON.stringify([
              {
                payload: (requests.at(-1)?.body as { payload: unknown }).payload
              }
            ]),
            {
              headers: { "Content-Type": "application/json" },
              status: 200
            }
          );
        }

        if (url.includes("slug=neq.")) {
          return new Response(
            JSON.stringify([
              {
                id: "briefing-old",
                language: "pl",
                payload: olderPublished,
                published_at: olderPublished.publishedAt,
                slug: olderPublished.slug,
                status: "published"
              }
            ]),
            {
              headers: { "Content-Type": "application/json" },
              status: 200
            }
          );
        }

        return new Response(
          JSON.stringify([
            {
              id: "briefing-new",
              language: "pl",
              payload: newerDraft,
              published_at: null,
              slug: newerDraft.slug,
              status: "draft"
            }
          ]),
          {
            headers: { "Content-Type": "application/json" },
            status: 200
          }
        );
      }
    });

    const published = await repository.publishBriefing(
      newerDraft.slug,
      "pl",
      "2026-08-13T07:00:00.000Z"
    );

    const patchBodies = requests
      .filter((request) => request.method === "PATCH")
      .map((request) => request.body as { payload?: { slug?: string; status?: string } });

    expect(published.slug).toBe(newerDraft.slug);
    expect(patchBodies).toHaveLength(2);
    expect(patchBodies[0]?.payload?.status).toBe("published");
    expect(patchBodies[1]?.payload?.slug).toBe(olderPublished.slug);
    expect(patchBodies[1]?.payload?.status).toBe("archived");
  });

  it("claims research runs idempotently", async () => {
    const requests: Array<{ body?: unknown; method: string; url: string }> = [];
    const now = new Date().toISOString();
    const existingRun = {
      completed_at: null,
      created_at: now,
      error_message: null,
      id: "run-1",
      idempotency_key: "morning-brew:2026-08-13:pl",
      language: "pl",
      metrics: {},
      run_date: "2026-08-13",
      started_at: now,
      status: "running"
    };
    let inserted = false;
    const repository = createSupabaseRestResearchRunRepository({
      apiKey: "test-key",
      url: "https://example.supabase.co",
      fetch: async (input, init) => {
        requests.push({
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
          method: init?.method ?? "GET",
          url: String(input)
        });

        if (init?.method === "POST" && !inserted) {
          inserted = true;
          return new Response(JSON.stringify([existingRun]), {
            headers: { "Content-Type": "application/json" },
            status: 201
          });
        }

        if (init?.method === "POST") {
          return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" },
            status: 201
          });
        }

        return new Response(JSON.stringify([existingRun]), {
          headers: { "Content-Type": "application/json" },
          status: 200
        });
      }
    });

    const firstClaim = await repository.claimResearchRun({
      idempotencyKey: "morning-brew:2026-08-13:pl",
      locale: "pl",
      runDate: "2026-08-13"
    });
    const secondClaim = await repository.claimResearchRun({
      idempotencyKey: "morning-brew:2026-08-13:pl",
      locale: "pl",
      runDate: "2026-08-13"
    });

    expect(firstClaim.acquired).toBe(true);
    expect(secondClaim.acquired).toBe(false);
    expect(requests.some((request) => request.url.includes("on_conflict=idempotency_key"))).toBe(
      true
    );
  });

  it("retries a failed research run instead of treating it as a duplicate", async () => {
    const requests: Array<{ body?: unknown; method: string; url: string }> = [];
    const failedRun = {
      completed_at: "2026-08-13T06:01:00.000Z",
      created_at: "2026-08-13T06:00:00.000Z",
      error_message: "insufficient_quota",
      id: "run-1",
      idempotency_key: "morning-brew:2026-08-13:pl",
      language: "pl",
      metrics: {},
      run_date: "2026-08-13",
      started_at: "2026-08-13T06:00:00.000Z",
      status: "failed"
    };
    const repository = createSupabaseRestResearchRunRepository({
      apiKey: "test-key",
      url: "https://example.supabase.co",
      fetch: async (input, init) => {
        requests.push({
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
          method: init?.method ?? "GET",
          url: String(input)
        });

        if (init?.method === "POST") {
          return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" },
            status: 201
          });
        }

        if (init?.method === "PATCH") {
          return new Response(
            JSON.stringify([
              {
                ...failedRun,
                completed_at: null,
                error_message: null,
                status: "running"
              }
            ]),
            {
              headers: { "Content-Type": "application/json" },
              status: 200
            }
          );
        }

        return new Response(JSON.stringify([failedRun]), {
          headers: { "Content-Type": "application/json" },
          status: 200
        });
      }
    });

    const claim = await repository.claimResearchRun({
      idempotencyKey: "morning-brew:2026-08-13:pl",
      locale: "pl",
      runDate: "2026-08-13"
    });

    expect(claim.acquired).toBe(true);
    expect(claim.run.status).toBe("running");
    expect(requests.some((request) => request.method === "PATCH")).toBe(true);
  });

  it("retries a stale running research run after a timeout", async () => {
    const requests: Array<{ body?: unknown; method: string; url: string }> = [];
    const staleRun = {
      completed_at: null,
      created_at: "2026-08-13T06:00:00.000Z",
      error_message: null,
      id: "run-1",
      idempotency_key: "morning-brew:2026-08-13:pl",
      language: "pl",
      metrics: {},
      run_date: "2026-08-13",
      started_at: "2026-08-13T06:00:00.000Z",
      status: "running"
    };
    const repository = createSupabaseRestResearchRunRepository({
      apiKey: "test-key",
      url: "https://example.supabase.co",
      fetch: async (input, init) => {
        requests.push({
          body: init?.body ? JSON.parse(String(init.body)) : undefined,
          method: init?.method ?? "GET",
          url: String(input)
        });

        if (init?.method === "POST") {
          return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" },
            status: 201
          });
        }

        if (init?.method === "PATCH") {
          return new Response(
            JSON.stringify([
              {
                ...staleRun,
                started_at: new Date().toISOString(),
                status: "running"
              }
            ]),
            {
              headers: { "Content-Type": "application/json" },
              status: 200
            }
          );
        }

        return new Response(JSON.stringify([staleRun]), {
          headers: { "Content-Type": "application/json" },
          status: 200
        });
      }
    });

    const claim = await repository.claimResearchRun({
      idempotencyKey: "morning-brew:2026-08-13:pl",
      locale: "pl",
      runDate: "2026-08-13"
    });

    expect(claim.acquired).toBe(true);
    expect(requests.some((request) => request.method === "PATCH")).toBe(true);
  });

  it("lists recent research runs", async () => {
    const requests: string[] = [];
    const repository = createSupabaseRestResearchRunRepository({
      apiKey: "test-key",
      url: "https://example.supabase.co",
      fetch: async (input) => {
        requests.push(String(input));
        return new Response(
          JSON.stringify([
            {
              completed_at: "2026-08-13T06:02:00.000Z",
              created_at: "2026-08-13T06:00:00.000Z",
              error_message: null,
              id: "run-1",
              idempotency_key: "morning-brew:2026-08-13:pl",
              language: "pl",
              metrics: { slug: "2026-08-13-us100-morning-brew" },
              run_date: "2026-08-13",
              started_at: "2026-08-13T06:00:00.000Z",
              status: "drafted"
            }
          ]),
          {
            headers: { "Content-Type": "application/json" },
            status: 200
          }
        );
      }
    });

    const runs = await repository.listResearchRuns({ limit: 5 });

    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("drafted");
    expect(requests[0]).toContain("limit=5");
    expect(requests[0]).toContain("order=run_date.desc");
  });
});
