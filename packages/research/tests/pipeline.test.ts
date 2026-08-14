import { describe, expect, it } from "vitest";

import { getLatestBriefing } from "../src";
import { createBudgetResearchCollector, createBudgetSignalAnalyzer } from "../src/budget-pipeline";
import {
  createFixtureAnalyzer,
  createFixtureCollector,
  createFixtureGenerator,
  createFixtureMorningBrewPipeline
} from "../src/fixture-pipeline";
import { createStructuredOutputGenerator } from "../src/generation";
import { createOpenAIResponsesGenerationClient } from "../src/generation";
import { createMorningBrewPipeline } from "../src/pipeline";

const context = {
  date: "2026-08-13",
  locale: "pl",
  now: new Date("2026-08-13T06:00:00.000Z"),
  runId: "test-run"
} as const;

describe("Morning Brew pipeline", () => {
  it("runs collector, analyzer, generator, strict schema validation and quality gates", async () => {
    const pipeline = createFixtureMorningBrewPipeline();
    const result = await pipeline.run(context);

    expect(result.status).toBe("succeeded");
    if (result.status !== "succeeded") {
      throw new Error(result.error);
    }
    expect(result.runId).toBe("test-run");
    expect(result.briefing.language).toBe("pl");
    expect(result.briefing.date).toBe("2026-08-13");
    expect(result.quality.passed).toBe(true);
    expect(result.evidencePack.snapshots).toHaveLength(1);
    expect(result.analysis.signals.length).toBeGreaterThan(0);
  });

  it("fails when generated output does not match the strict MorningBrew schema", async () => {
    const pipeline = createMorningBrewPipeline({
      analyzer: createFixtureAnalyzer(),
      collector: createFixtureCollector(),
      generator: {
        async generate() {
          return { headline: "Missing required fields" };
        }
      }
    });

    const result = await pipeline.run(context);
    expect(result.status).toBe("failed");
    expect(result.quality.passed).toBe(false);
    expect(result.quality.issues[0]?.gateId).toBe("strict_schema_validation");
  });

  it("fails quality gates when briefing locale does not match the run context", async () => {
    const englishBriefing = getLatestBriefing("en");
    const pipeline = createMorningBrewPipeline({
      analyzer: createFixtureAnalyzer(),
      collector: createFixtureCollector(),
      generator: createFixtureGenerator({
        pl: {
          ...englishBriefing,
          date: context.date,
          language: "en"
        }
      })
    });

    const result = await pipeline.run(context);
    expect(result.status).toBe("failed");
    expect(result.quality.issues.some((issue) => issue.gateId === "context_matches_briefing")).toBe(
      true
    );
  });

  it("supports an exchangeable structured generation client", async () => {
    const briefing = getLatestBriefing("pl");
    const generator = createStructuredOutputGenerator({
      async generateMorningBrew(request) {
        expect(request.schemaName).toBe("MorningBrewSchema");
        expect(request.instructions).toContain("do not return markdown");
        return briefing;
      }
    });
    const pipeline = createMorningBrewPipeline({
      analyzer: createFixtureAnalyzer(),
      collector: createFixtureCollector(),
      generator
    });

    const result = await pipeline.run(context);
    expect(result.status).toBe("succeeded");
  });

  it("normalizes date-only source timestamps from the evidence pack", async () => {
    const briefing = getLatestBriefing("pl");
    const pipeline = createMorningBrewPipeline({
      analyzer: createFixtureAnalyzer(),
      collector: {
        async collect() {
          return {
            date: context.date,
            collectedAt: "2026-08-13T06:00:00.000Z",
            locale: context.locale,
            snapshots: [
              {
                capturedAt: "2026-08-13T06:00:00.000Z",
                payload: { value: "test" },
                source: "source-a"
              }
            ],
            sources: [
              {
                id: "source-a",
                observedAt: "2026-08-13",
                publisher: "Test publisher",
                title: "Source A",
                url: "https://example.com/source-a"
              }
            ]
          };
        }
      },
      generator: {
        async generate() {
          return {
            ...briefing,
            date: context.date
          };
        }
      }
    });

    const result = await pipeline.run(context);
    expect(result.status).toBe("succeeded");
    if (result.status !== "succeeded") {
      throw new Error(result.error);
    }
    expect(result.briefing.sources[0]?.observedAt).toBe("2026-08-13T12:00:00.000Z");
  });

  it("preserves the full evidence pack source list in the final briefing", async () => {
    const briefing = getLatestBriefing("pl");
    const evidenceSources = [
      {
        id: "source-a",
        observedAt: "2026-08-13T06:00:00.000Z",
        publisher: "Test publisher",
        title: "Source A",
        url: "https://example.com/source-a"
      },
      {
        id: "source-b",
        observedAt: "2026-08-13T06:01:00.000Z",
        publisher: "Test publisher",
        title: "Source B",
        url: "https://example.com/source-b"
      }
    ];
    const pipeline = createMorningBrewPipeline({
      analyzer: createFixtureAnalyzer(),
      collector: {
        async collect() {
          return {
            collectedAt: "2026-08-13T06:00:00.000Z",
            date: context.date,
            locale: context.locale,
            snapshots: [
              {
                capturedAt: "2026-08-13T06:00:00.000Z",
                payload: { value: "test" },
                source: "source-a"
              }
            ],
            sources: evidenceSources
          };
        }
      },
      generator: {
        async generate() {
          return {
            ...briefing,
            date: context.date,
            sources: [briefing.sources[0]]
          };
        }
      }
    });

    const result = await pipeline.run(context);
    expect(result.status).toBe("succeeded");
    if (result.status !== "succeeded") {
      throw new Error(result.error);
    }
    expect(result.briefing.sources.map((source) => source.id)).toEqual(["source-a", "source-b"]);
  });

  it("calls OpenAI Responses API with strict JSON schema output", async () => {
    const briefing = getLatestBriefing("pl");
    const requests: Array<{ body: unknown; url: string }> = [];
    const client = createOpenAIResponsesGenerationClient({
      apiKey: "test-key",
      baseUrl: "https://api.openai.test",
      fetch: async (input, init) => {
        requests.push({
          body: JSON.parse(String(init?.body)),
          url: String(input)
        });
        return new Response(
          JSON.stringify({
            output: [
              {
                content: [
                  {
                    text: JSON.stringify(briefing),
                    type: "output_text"
                  }
                ],
                type: "message"
              }
            ]
          }),
          { headers: { "Content-Type": "application/json" }, status: 200 }
        );
      },
      model: "gpt-5"
    });

    const generator = createStructuredOutputGenerator(client);
    const pipeline = createMorningBrewPipeline({
      analyzer: createFixtureAnalyzer(),
      collector: createFixtureCollector(),
      generator
    });

    const result = await pipeline.run(context);
    expect(result.status).toBe("succeeded");
    expect(requests[0]?.url).toBe("https://api.openai.test/v1/responses");
    expect(requests[0]?.body).toMatchObject({
      max_output_tokens: 6500,
      model: "gpt-5",
      reasoning: {
        effort: "minimal"
      },
      store: false,
      text: {
        format: {
          name: "us100_morning_brew",
          strict: true,
          type: "json_schema"
        },
        verbosity: "low"
      }
    });
  });

  it("returns a readable OpenAI timeout error", async () => {
    const client = createOpenAIResponsesGenerationClient({
      apiKey: "test-key",
      baseUrl: "https://api.openai.test",
      fetch: (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("This operation was aborted", "AbortError"));
          });
        }),
      requestTimeoutMs: 1
    });

    await expect(client.generateMorningBrew({
      input: {
        analysis: await createFixtureAnalyzer().analyze(
          await createFixtureCollector().collect(context),
          context
        ),
        context,
        evidencePack: await createFixtureCollector().collect(context)
      },
      instructions: "Return JSON.",
      schemaName: "MorningBrewSchema",
      system: "Test."
    })).rejects.toThrow("OpenAI generation timed out after");
  });

  it("collects and analyzes budget research evidence without paid data providers", async () => {
    const csv = [
      "Date,Open,High,Low,Close,Volume",
      ...Array.from({ length: 220 }, (_, index) => {
        const day = String(index + 1).padStart(2, "0");
        const close = 100 + index;
        return `2026-01-${day.slice(-2)},${close - 1},${close + 1},${close - 2},${close},1000`;
      })
    ].join("\n");
    const collector = createBudgetResearchCollector({
      env: {
        US100_BUDGET_NEWS_RSS_ENABLED: "false"
      },
      fetch: async () =>
        new Response(csv, {
          headers: { "Content-Type": "text/csv" },
          status: 200
        }),
      maxRequests: 20
    });
    const evidencePack = await collector.collect(context);
    const analysis = await createBudgetSignalAnalyzer().analyze(evidencePack, context);

    expect(evidencePack.sources.some((source) => source.id === "stooq-ndx")).toBe(true);
    expect(evidencePack.snapshots.length).toBeGreaterThan(1);
    expect(analysis.signals).toHaveLength(5);
    expect(analysis.summary).toContain("Budget pipeline");
  });
});
