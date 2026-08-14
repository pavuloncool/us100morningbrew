import type { BriefingGenerator, GenerationInput } from "./pipeline";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

type OpenAIResponsesGenerationClientConfig = {
  apiKey: string;
  baseUrl?: string;
  fetch?: FetchLike;
  model?: string;
  requestTimeoutMs?: number;
};

export type StructuredBriefingGenerationRequest = {
  input: GenerationInput;
  instructions: string;
  schemaName: "MorningBrewSchema";
  system: string;
};

export type StructuredGenerationClient = {
  generateMorningBrew(request: StructuredBriefingGenerationRequest): Promise<unknown>;
};

const signalImpactValues = [
  "short_thesis_strengthened",
  "short_thesis_weakened",
  "mixed",
  "unchanged"
] as const;

const evidenceSchema = {
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    sourceIds: {
      items: { type: "string" },
      type: "array"
    },
    value: { type: "string" }
  },
  required: ["label", "value", "sourceIds"],
  type: "object"
} as const;

const briefingSectionSchema = {
  additionalProperties: false,
  properties: {
    evidence: {
      items: evidenceSchema,
      type: "array"
    },
    impact: { enum: signalImpactValues, type: "string" },
    observation: { type: "string" },
    title: { type: "string" },
    whyItMatters: { type: "string" }
  },
  required: ["title", "observation", "whyItMatters", "impact", "evidence"],
  type: "object"
} as const;

const scorecardItemSchema = {
  additionalProperties: false,
  properties: {
    factor: { type: "string" },
    observation: { type: "string" },
    signal: { enum: signalImpactValues, type: "string" },
    whyItMatters: { type: "string" }
  },
  required: ["factor", "signal", "observation", "whyItMatters"],
  type: "object"
} as const;

const watchItemSchema = {
  additionalProperties: false,
  properties: {
    label: { type: "string" },
    trigger: { type: "string" },
    whyItMatters: { type: "string" }
  },
  required: ["label", "trigger", "whyItMatters"],
  type: "object"
} as const;

const sourceSchema = {
  additionalProperties: false,
  properties: {
    id: { type: "string" },
    observedAt: {
      type: ["string", "null"]
    },
    publisher: {
      type: ["string", "null"]
    },
    title: { type: "string" },
    url: { type: "string" }
  },
  required: ["id", "title", "publisher", "url", "observedAt"],
  type: "object"
} as const;

export const morningBrewJsonSchema = {
  additionalProperties: false,
  properties: {
    date: { pattern: "^\\d{4}-\\d{2}-\\d{2}$", type: "string" },
    deck: { type: "string" },
    headline: { type: "string" },
    keySignal: {
      additionalProperties: false,
      properties: {
        evidence: {
          items: evidenceSchema,
          type: "array"
        },
        impact: { enum: signalImpactValues, type: "string" },
        observation: { type: "string" },
        title: { type: "string" },
        whyItMatters: { type: "string" }
      },
      required: ["title", "observation", "whyItMatters", "impact", "evidence"],
      type: "object"
    },
    language: { enum: ["pl", "en"], type: "string" },
    levelsToWatch: {
      items: watchItemSchema,
      type: "array"
    },
    publishedAt: {
      type: ["string", "null"]
    },
    schemaVersion: { enum: ["0.1.0"], type: "string" },
    sections: {
      additionalProperties: false,
      properties: {
        aiSemis: briefingSectionSchema,
        breadth: briefingSectionSchema,
        priceAction: briefingSectionSchema,
        ratesFed: briefingSectionSchema,
        volatility: briefingSectionSchema
      },
      required: ["priceAction", "breadth", "aiSemis", "ratesFed", "volatility"],
      type: "object"
    },
    slug: { type: "string" },
    sources: {
      items: sourceSchema,
      type: "array"
    },
    status: { enum: ["draft", "published", "archived"], type: "string" },
    thesisScorecard: {
      items: scorecardItemSchema,
      type: "array"
    },
    verdict: {
      additionalProperties: false,
      properties: {
        conviction: { enum: ["low", "medium", "high"], type: "string" },
        stance: { enum: signalImpactValues, type: "string" },
        summary: { type: "string" },
        whyItMatters: { type: "string" }
      },
      required: ["stance", "conviction", "summary", "whyItMatters"],
      type: "object"
    },
    whatChanged: {
      items: watchItemSchema,
      type: "array"
    }
  },
  required: [
    "schemaVersion",
    "language",
    "date",
    "slug",
    "status",
    "publishedAt",
    "headline",
    "deck",
    "verdict",
    "keySignal",
    "sections",
    "thesisScorecard",
    "whatChanged",
    "levelsToWatch",
    "sources"
  ],
  type: "object"
} as const;

export function buildGenerationRequest(
  input: GenerationInput
): StructuredBriefingGenerationRequest {
  const publicationLanguage =
    input.context.locale === "pl" ? "Polish" : "English";

  return {
    input,
    instructions: [
      `Return a complete ${publicationLanguage} US100 Morning Brew briefing.`,
      "Use only structured data matching MorningBrewSchema; do not return markdown.",
      "Actively falsify the medium-term US100 short thesis instead of only confirming it.",
      "For every material signal, explain why it matters using causal market reasoning.",
      "Choose one most important signal of the day and explain why it matters for US100.",
      "Preserve source IDs from the evidence pack whenever evidence is referenced."
    ].join("\n"),
    schemaName: "MorningBrewSchema",
    system:
      "You generate structured daily US100 / Nasdaq-100 market briefings for a deterministic publishing pipeline."
  };
}

export function createStructuredOutputGenerator(
  client: StructuredGenerationClient
): BriefingGenerator {
  return {
    async generate(input) {
      return client.generateMorningBrew(buildGenerationRequest(input));
    }
  };
}

function extractResponseText(responseBody: unknown): string {
  if (
    typeof responseBody === "object" &&
    responseBody !== null &&
    "output_text" in responseBody &&
    typeof responseBody.output_text === "string"
  ) {
    return responseBody.output_text;
  }

  if (
    typeof responseBody === "object" &&
    responseBody !== null &&
    "output" in responseBody &&
    Array.isArray(responseBody.output)
  ) {
    for (const outputItem of responseBody.output) {
      if (
        typeof outputItem === "object" &&
        outputItem !== null &&
        "content" in outputItem &&
        Array.isArray(outputItem.content)
      ) {
        for (const contentItem of outputItem.content) {
          if (
            typeof contentItem === "object" &&
            contentItem !== null &&
            "text" in contentItem &&
            typeof contentItem.text === "string"
          ) {
            return contentItem.text;
          }
        }
      }
    }
  }

  throw new Error("OpenAI response did not include structured output text.");
}

function buildOpenAIInput(request: StructuredBriefingGenerationRequest) {
  return [
    {
      content: request.system,
      role: "system"
    },
    {
      content: [
        request.instructions,
        "",
        "Run context, evidence pack, and deterministic analysis:",
        JSON.stringify(request.input, null, 2)
      ].join("\n"),
      role: "user"
    }
  ];
}

export function createOpenAIResponsesGenerationClient(
  config: OpenAIResponsesGenerationClientConfig
): StructuredGenerationClient {
  const fetcher = config.fetch ?? fetch;
  const baseUrl = config.baseUrl ?? "https://api.openai.com";
  const model = config.model ?? "gpt-5-mini";
  const requestTimeoutMs = config.requestTimeoutMs ?? 45_000;

  return {
    async generateMorningBrew(request) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const response = await fetcher(new URL("/v1/responses", baseUrl), {
          body: JSON.stringify({
            input: buildOpenAIInput(request),
            model,
            store: false,
            text: {
              format: {
                description:
                  "A complete structured US100 Morning Brew payload ready for schema validation and publication.",
                name: "us100_morning_brew",
                schema: morningBrewJsonSchema,
                strict: true,
                type: "json_schema"
              }
            }
          }),
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json"
          },
          method: "POST",
          signal: controller.signal
        });

        const responseBody = (await response.json()) as unknown;
        if (!response.ok) {
          throw new Error(`OpenAI Responses API failed with ${response.status}: ${JSON.stringify(responseBody)}`);
        }

        return JSON.parse(extractResponseText(responseBody));
      } finally {
        clearTimeout(timeout);
      }
    }
  };
}

export function createOpenAIResponsesGenerationClientFromEnv(
  env: Record<string, string | undefined> = process.env
): StructuredGenerationClient {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI generation.");
  }

  return createOpenAIResponsesGenerationClient({
    apiKey,
    model: env.OPENAI_MODEL ?? "gpt-5-mini",
    requestTimeoutMs: Number(env.OPENAI_REQUEST_TIMEOUT_MS ?? 45_000)
  });
}
