import {
  LocaleSchema,
  MorningBrewSchema,
  type Locale,
  type MorningBrew,
  type SignalImpact
} from "@us100/contracts";

export type ResearchRunContext = {
  date: string;
  locale: Locale;
  minEvidenceSources?: number;
  now?: Date;
  reportType?: "daily" | "weekly";
  runId?: string;
  slugSuffix?: string;
  targetStatus?: Extract<MorningBrew["status"], "draft" | "published">;
};

export type MarketSnapshot = {
  capturedAt: string;
  payload: Record<string, unknown>;
  source: string;
};

export type SourceDocument = {
  id: string;
  observedAt: string | null;
  publisher: string | null;
  title: string;
  url: string;
};

export type EvidencePack = {
  collectedAt: string;
  date: string;
  locale: Locale;
  snapshots: MarketSnapshot[];
  sources: SourceDocument[];
};

export type DeterministicSignal = {
  evidence: string[];
  impact: SignalImpact;
  label: string;
  score: number;
  whyItMatters: string;
};

export type AnalysisOutput = {
  generatedAt: string;
  keyDivergences: string[];
  signals: DeterministicSignal[];
  summary: string;
};

export type ResearchCollector = {
  collect(context: ResearchRunContext): Promise<EvidencePack>;
};

export type SignalAnalyzer = {
  analyze(evidencePack: EvidencePack, context: ResearchRunContext): Promise<AnalysisOutput>;
};

export type BriefingGenerator = {
  generate(input: GenerationInput): Promise<unknown>;
};

export type BriefingWriter = {
  saveBriefing(briefing: MorningBrew): Promise<MorningBrew>;
};

export type GenerationInput = {
  analysis: AnalysisOutput;
  context: ResearchRunContext;
  evidencePack: EvidencePack;
};

export type QualityGateSeverity = "error" | "warning";

export type QualityGateIssue = {
  gateId: string;
  message: string;
  severity: QualityGateSeverity;
};

export type QualityGate = {
  id: string;
  run(briefing: MorningBrew, input: GenerationInput): QualityGateIssue[];
};

export type QualityGateResult = {
  issues: QualityGateIssue[];
  passed: boolean;
};

export type PipelineSuccessResult = {
  analysis: AnalysisOutput;
  briefing: MorningBrew;
  completedAt: string;
  evidencePack: EvidencePack;
  quality: QualityGateResult;
  runId: string;
  savedBriefing: MorningBrew | null;
  startedAt: string;
  status: "succeeded";
  timingsMs: Record<string, number>;
};

export type PipelineFailedResult = {
  analysis?: AnalysisOutput;
  completedAt: string;
  error: string;
  evidencePack?: EvidencePack;
  quality: QualityGateResult;
  runId: string;
  startedAt: string;
  status: "failed";
  timingsMs: Record<string, number>;
};

export type PipelineRunResult = PipelineSuccessResult | PipelineFailedResult;

export type MorningBrewPipeline = {
  run(context: ResearchRunContext): Promise<PipelineRunResult>;
};

export type MorningBrewPipelineConfig = {
  analyzer: SignalAnalyzer;
  collector: ResearchCollector;
  generator: BriefingGenerator;
  qualityGates?: QualityGate[];
  writer?: BriefingWriter;
};

function isoNow(context: Pick<ResearchRunContext, "now">): string {
  return (context.now ?? new Date()).toISOString();
}

function createRunId(context: ResearchRunContext): string {
  return context.runId ?? `${context.date}:${context.locale}:${isoNow(context)}`;
}

function normalizeObservedAt(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T12:00:00.000Z`;
  }
  return value;
}

function normalizeSourceDates(rawBriefing: unknown): unknown {
  if (typeof rawBriefing !== "object" || rawBriefing === null || !("sources" in rawBriefing)) {
    return rawBriefing;
  }
  const sources = (rawBriefing as { sources?: unknown }).sources;
  if (!Array.isArray(sources)) {
    return rawBriefing;
  }
  return {
    ...rawBriefing,
    sources: sources.map((source) => {
      if (typeof source !== "object" || source === null || !("observedAt" in source)) {
        return source;
      }
      return {
        ...source,
        observedAt: normalizeObservedAt((source as { observedAt?: unknown }).observedAt)
      };
    })
  };
}

function withCanonicalSources(rawBriefing: unknown, sources: SourceDocument[]): unknown {
  if (sources.length === 0 || typeof rawBriefing !== "object" || rawBriefing === null) {
    return rawBriefing;
  }
  return {
    ...rawBriefing,
    sources
  };
}

function withSlugSuffix(slug: string, suffix: string | undefined): string {
  if (!suffix) {
    return slug;
  }
  return slug.endsWith(`-${suffix}`) ? slug : `${slug}-${suffix}`;
}

function canonicalSlug(rawSlug: string, context: ResearchRunContext): string {
  if (context.reportType === "weekly") {
    return `${context.date}-us100-weekly-short-thesis`;
  }
  return rawSlug;
}

function normalizeGeneratedBriefing(
  rawBriefing: unknown,
  context: ResearchRunContext,
  canonicalSources: SourceDocument[]
): MorningBrew {
  const parsed = MorningBrewSchema.parse(
    normalizeSourceDates(withCanonicalSources(rawBriefing, canonicalSources))
  );

  if (!context.targetStatus) {
    return MorningBrewSchema.parse({
      ...parsed,
      slug: withSlugSuffix(canonicalSlug(parsed.slug, context), context.slugSuffix)
    });
  }

  return MorningBrewSchema.parse({
    ...parsed,
    publishedAt:
      context.targetStatus === "published" ? parsed.publishedAt ?? isoNow(context) : null,
    slug: withSlugSuffix(canonicalSlug(parsed.slug, context), context.slugSuffix),
    status: context.targetStatus
  });
}

function zodErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function runQualityGates(
  briefing: MorningBrew,
  input: GenerationInput,
  qualityGates: QualityGate[]
): QualityGateResult {
  const issues = qualityGates.flatMap((gate) => gate.run(briefing, input));
  return {
    issues,
    passed: !issues.some((issue) => issue.severity === "error")
  };
}

function whyTexts(briefing: MorningBrew): string[] {
  return [
    briefing.verdict.whyItMatters,
    briefing.keySignal.whyItMatters,
    ...Object.values(briefing.sections).map((section) => section.whyItMatters),
    ...briefing.thesisScorecard.map((item) => item.whyItMatters),
    ...briefing.whatChanged.map((item) => item.whyItMatters),
    ...briefing.levelsToWatch.map((item) => item.whyItMatters),
    ...(briefing.weeklySummary
      ? [
          briefing.weeklySummary.verdict.whyItMatters,
          ...briefing.weeklySummary.keyChanges.map((item) => item.whyItMatters),
          ...briefing.weeklySummary.thesisSignals.map((item) => item.whyItMatters),
          ...briefing.weeklySummary.levelsToWatch.map((item) => item.whyItMatters)
        ]
      : [])
  ];
}

export const defaultQualityGates: QualityGate[] = [
  {
    id: "context_matches_briefing",
    run(briefing, input) {
      const issues: QualityGateIssue[] = [];
      if (briefing.date !== input.context.date) {
        issues.push({
          gateId: "context_matches_briefing",
          message: `Briefing date ${briefing.date} does not match run date ${input.context.date}.`,
          severity: "error"
        });
      }
      if (briefing.language !== input.context.locale) {
        issues.push({
          gateId: "context_matches_briefing",
          message: `Briefing language ${briefing.language} does not match run locale ${input.context.locale}.`,
          severity: "error"
        });
      }
      return issues;
    }
  },
  {
    id: "all_core_sections_present",
    run(briefing) {
      const requiredSections = ["priceAction", "breadth", "aiSemis", "ratesFed", "volatility"];
      const missingSections = requiredSections.filter(
        (section) => !(section in briefing.sections)
      );
      return missingSections.map((section) => ({
        gateId: "all_core_sections_present",
        message: `Missing required section: ${section}.`,
        severity: "error" as const
      }));
    }
  },
  {
    id: "causal_reasoning_depth",
    run(briefing) {
      return whyTexts(briefing)
        .filter((text) => text.trim().length < 40)
        .map((text) => ({
          gateId: "causal_reasoning_depth",
          message: `whyItMatters is too shallow: ${text}`,
          severity: "error" as const
        }));
    }
  },
  {
    id: "evidence_and_sources",
    run(briefing, input) {
      const issues: QualityGateIssue[] = [];
      const minEvidenceSources = input.context.minEvidenceSources ?? 1;
      if (input.evidencePack.sources.length < minEvidenceSources) {
        issues.push({
          gateId: "evidence_and_sources",
          message: `Evidence pack has ${input.evidencePack.sources.length} sources; minimum is ${minEvidenceSources}.`,
          severity: "error"
        });
      }
      if (input.evidencePack.sources.length === 0 || briefing.sources.length === 0) {
        issues.push({
          gateId: "evidence_and_sources",
          message: "Briefing must preserve at least one source from the evidence pack.",
          severity: "error"
        });
      }
      const briefingSourceIds = new Set(briefing.sources.map((source) => source.id));
      const missingSourceIds = input.evidencePack.sources
        .map((source) => source.id)
        .filter((sourceId) => !briefingSourceIds.has(sourceId));
      if (missingSourceIds.length > 0) {
        issues.push({
          gateId: "evidence_and_sources",
          message: `Briefing omitted evidence pack sources: ${missingSourceIds.join(", ")}.`,
          severity: "error"
        });
      }
      if (briefing.keySignal.evidence.length === 0) {
        issues.push({
          gateId: "evidence_and_sources",
          message: "Key signal must include evidence.",
          severity: "error"
        });
      }
      return issues;
    }
  },
  {
    id: "falsification_balance",
    run(briefing) {
      const impacts = [
        briefing.verdict.stance,
        briefing.keySignal.impact,
        ...Object.values(briefing.sections).map((section) => section.impact),
        ...briefing.thesisScorecard.map((item) => item.signal)
      ];
      const hasStrengthening = impacts.includes("short_thesis_strengthened");
      const hasWeakening = impacts.includes("short_thesis_weakened");
      if (!hasStrengthening || !hasWeakening) {
        return [
          {
            gateId: "falsification_balance",
            message:
              "Briefing should include both strengthening and weakening evidence unless the market signal is genuinely one-sided.",
            severity: "warning"
          }
        ];
      }
      return [];
    }
  },
  {
    id: "weekly_summary_presence",
    run(briefing, input) {
      if (input.context.reportType === "weekly" && briefing.weeklySummary === null) {
        return [
          {
            gateId: "weekly_summary_presence",
            message: "Weekly report runs must include weeklySummary.",
            severity: "error" as const
          }
        ];
      }
      if ((input.context.reportType ?? "daily") === "daily" && briefing.weeklySummary !== null) {
        return [
          {
            gateId: "weekly_summary_presence",
            message: "Daily report runs must not include weeklySummary.",
            severity: "error" as const
          }
        ];
      }
      return [];
    }
  }
];

export function createMorningBrewPipeline(
  config: MorningBrewPipelineConfig
): MorningBrewPipeline {
  const qualityGates = config.qualityGates ?? defaultQualityGates;

  return {
    async run(context) {
      const parsedContext = {
        ...context,
        locale: LocaleSchema.parse(context.locale)
      };
      const runId = createRunId(parsedContext);
      const startedAt = isoNow(parsedContext);
      const runStartedAtMs = Date.now();
      const timingsMs: Record<string, number> = {};
      let evidencePack: EvidencePack | undefined;
      let analysis: AnalysisOutput | undefined;

      try {
        const collectStartedAtMs = Date.now();
        evidencePack = await config.collector.collect(parsedContext);
        timingsMs.collect = Date.now() - collectStartedAtMs;
        const analyzeStartedAtMs = Date.now();
        analysis = await config.analyzer.analyze(evidencePack, parsedContext);
        timingsMs.analyze = Date.now() - analyzeStartedAtMs;
        const generationInput = { analysis, context: parsedContext, evidencePack };
        const generateStartedAtMs = Date.now();
        const rawBriefing = await config.generator.generate(generationInput);
        timingsMs.generate = Date.now() - generateStartedAtMs;
        const validateStartedAtMs = Date.now();
        const briefing = normalizeGeneratedBriefing(rawBriefing, parsedContext, evidencePack.sources);
        const quality = runQualityGates(briefing, generationInput, qualityGates);
        timingsMs.validate = Date.now() - validateStartedAtMs;

        if (!quality.passed) {
          timingsMs.total = Date.now() - runStartedAtMs;
          return {
            analysis,
            completedAt: isoNow(parsedContext),
            error: "Quality gates failed.",
            evidencePack,
            quality,
            runId,
            startedAt,
            status: "failed",
            timingsMs
          };
        }

        const saveStartedAtMs = Date.now();
        const savedBriefing = config.writer ? await config.writer.saveBriefing(briefing) : null;
        timingsMs.save = Date.now() - saveStartedAtMs;
        timingsMs.total = Date.now() - runStartedAtMs;
        return {
          analysis,
          briefing,
          completedAt: isoNow(parsedContext),
          evidencePack,
          quality,
          runId,
          savedBriefing,
          startedAt,
          status: "succeeded",
          timingsMs
        };
      } catch (error) {
        timingsMs.total = Date.now() - runStartedAtMs;
        return {
          analysis,
          completedAt: isoNow(parsedContext),
          error: zodErrorMessage(error),
          evidencePack,
          quality: {
            issues: [
              {
                gateId: "strict_schema_validation",
                message: zodErrorMessage(error),
                severity: "error"
              }
            ],
            passed: false
          },
          runId,
          startedAt,
          status: "failed",
          timingsMs
        };
      }
    }
  };
}
