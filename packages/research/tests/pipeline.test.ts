import { describe, expect, it } from "vitest";

import { getLatestBriefing } from "../src";
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
      model: "gpt-5",
      store: false,
      text: {
        format: {
          name: "us100_morning_brew",
          strict: true,
          type: "json_schema"
        }
      }
    });
  });
});
