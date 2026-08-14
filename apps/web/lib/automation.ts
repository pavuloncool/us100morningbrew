import type { Locale, MorningBrew } from "@us100/contracts";
import {
  createBudgetResearchCollector,
  createBudgetSignalAnalyzer,
  createFixtureAnalyzer,
  createFixtureCollector,
  createFixtureGenerator,
  createMorningBrewPipeline,
  createOpenAIResponsesGenerationClientFromEnv,
  createStructuredOutputGenerator,
  type BriefingGenerator,
  type PipelineRunResult
} from "@us100/research";

import {
  appLocales,
  getBriefingRepository,
  getResearchRunRepository,
  isAppLocale,
  type AppLocale
} from "./briefings";

type AutomationEnv = Record<string, string | undefined>;

export type WarsawRunWindow = {
  date: string;
  hour: number;
  isWeekday: boolean;
  shouldRun: boolean;
  weekday: string;
};

export type MorningBrewAutomationOptions = {
  date?: string;
  force?: boolean;
  idempotencyScope?: string;
  locales?: AppLocale[];
  now?: Date;
  runSource?: string;
  slugSuffix?: string;
};

export type LocaleAutomationResult = {
  idempotencyKey: string;
  locale: AppLocale;
  result?: PipelineRunResult;
  runId?: string;
  status: "completed" | "failed" | "skipped_duplicate";
};

export type MorningBrewAutomationResult = {
  date: string;
  force: boolean;
  locales: LocaleAutomationResult[];
  skippedReason?: string;
  status: "completed" | "failed" | "skipped";
  window: WarsawRunWindow;
};

const warsawTimeZone = "Europe/Warsaw";
const weekdayValues = new Set(["Mon", "Tue", "Wed", "Thu", "Fri"]);

function warsawDatePart(now: Date, type: Intl.DateTimeFormatPartTypes): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    month: "2-digit",
    timeZone: warsawTimeZone,
    weekday: "short",
    year: "numeric"
  }).formatToParts(now);
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function getWarsawRunWindow(now: Date = new Date()): WarsawRunWindow {
  const weekday = warsawDatePart(now, "weekday");
  const hour = Number(warsawDatePart(now, "hour"));
  const year = warsawDatePart(now, "year");
  const month = warsawDatePart(now, "month");
  const day = warsawDatePart(now, "day");
  const isWeekday = weekdayValues.has(weekday);

  return {
    date: `${year}-${month}-${day}`,
    hour,
    isWeekday,
    shouldRun: isWeekday && hour === 8,
    weekday
  };
}

function parseLocales(value: string | undefined): AppLocale[] {
  const rawLocales = value?.split(",").map((locale) => locale.trim()).filter(Boolean);
  if (!rawLocales || rawLocales.length === 0) {
    return [...appLocales];
  }

  const locales = rawLocales.filter(isAppLocale);
  return locales.length > 0 ? locales : [...appLocales];
}

function targetStatusFromEnv(env: AutomationEnv): Extract<MorningBrew["status"], "draft" | "published"> {
  return env.US100_GENERATION_TARGET_STATUS === "published" ? "published" : "draft";
}

function createGeneratorFromEnv(env: AutomationEnv): BriefingGenerator {
  const provider =
    env.US100_GENERATION_PROVIDER ?? (env.NODE_ENV === "production" ? "openai" : "fixture");

  if (provider === "fixture") {
    return createFixtureGenerator();
  }

  if (provider !== "openai") {
    throw new Error(`Unsupported US100_GENERATION_PROVIDER: ${provider}.`);
  }

  return createStructuredOutputGenerator(createOpenAIResponsesGenerationClientFromEnv(env));
}

function researchProviderFromEnv(env: AutomationEnv): "budget" | "fixture" {
  const provider =
    env.US100_RESEARCH_PROVIDER ?? (env.NODE_ENV === "production" ? "budget" : "fixture");
  if (provider === "fixture" || provider === "budget") {
    return provider;
  }
  throw new Error(`Unsupported US100_RESEARCH_PROVIDER: ${provider}.`);
}

function statusForBriefing(briefing: MorningBrew): "drafted" | "published" {
  return briefing.status === "published" ? "published" : "drafted";
}

function isSupabaseConfigured(env: AutomationEnv): boolean {
  return Boolean(env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY));
}

export function assertAutomationEnv(env: AutomationEnv = process.env): void {
  if (env.NODE_ENV !== "production") {
    return;
  }

  if (env.US100_CRON_DRY_RUN === "true") {
    return;
  }

  if (!isSupabaseConfigured(env)) {
    throw new Error("Production cron requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }

  if ((env.US100_GENERATION_PROVIDER ?? "openai") === "openai" && !env.OPENAI_API_KEY) {
    throw new Error("Production cron with OpenAI generation requires OPENAI_API_KEY.");
  }
}

export async function runMorningBrewAutomation(
  options: MorningBrewAutomationOptions = {},
  env: AutomationEnv = process.env
): Promise<MorningBrewAutomationResult> {
  assertAutomationEnv(env);

  const now = options.now ?? new Date();
  const window = getWarsawRunWindow(now);
  const force = options.force ?? false;
  const date = options.date ?? window.date;
  const locales = options.locales ?? parseLocales(env.US100_CRON_LOCALES);
  const runSource = options.runSource ?? "vercel-cron";

  if (!force && !window.shouldRun) {
    return {
      date,
      force,
      locales: [],
      skippedReason: "Not the 08:00 Europe/Warsaw weekday run window.",
      status: "skipped",
      window
    };
  }

  const briefingRepository = getBriefingRepository();
  const researchRunRepository = getResearchRunRepository();
  const generator = createGeneratorFromEnv(env);
  const researchProvider = researchProviderFromEnv(env);
  const localeResults: LocaleAutomationResult[] = [];

  for (const locale of locales) {
    const idempotencyKey = options.idempotencyScope
      ? `morning-brew:${date}:${locale}:${options.idempotencyScope}`
      : `morning-brew:${date}:${locale}`;
    const claim = await researchRunRepository.claimResearchRun({
      idempotencyKey,
      locale,
      metrics: { source: runSource },
      runDate: date
    });

    if (!claim.acquired) {
      localeResults.push({
        idempotencyKey,
        locale,
        runId: claim.run.id,
        status: "skipped_duplicate"
      });
      continue;
    }

    const pipeline = createMorningBrewPipeline({
      analyzer:
        researchProvider === "budget" ? createBudgetSignalAnalyzer() : createFixtureAnalyzer(),
      collector:
        researchProvider === "budget" ? createBudgetResearchCollector({ env }) : createFixtureCollector(),
      generator,
      writer: briefingRepository
    });
    const result = await pipeline.run({
      date,
      locale: locale satisfies Locale,
      now,
      runId: claim.run.id,
      slugSuffix: options.slugSuffix,
      targetStatus: targetStatusFromEnv(env)
    });

    if (result.status === "succeeded") {
      await researchRunRepository.completeResearchRun(claim.run.id, {
        metrics: {
          evidenceSnapshots: result.evidencePack.snapshots.length,
          evidenceSources: result.evidencePack.sources.length,
          issues: result.quality.issues,
          slug: result.briefing.slug,
          status: result.briefing.status,
          timingsMs: result.timingsMs
        },
        status: statusForBriefing(result.briefing)
      });
      localeResults.push({
        idempotencyKey,
        locale,
        result,
        runId: claim.run.id,
        status: "completed"
      });
      continue;
    }

    await researchRunRepository.completeResearchRun(claim.run.id, {
      errorMessage: result.error,
      metrics: {
        evidenceSnapshots: result.evidencePack?.snapshots.length ?? null,
        evidenceSources: result.evidencePack?.sources.length ?? null,
        issues: result.quality.issues,
        timingsMs: result.timingsMs
      },
      status: "failed"
    });
    localeResults.push({
      idempotencyKey,
      locale,
      result,
      runId: claim.run.id,
      status: "failed"
    });
  }

  return {
    date,
    force,
    locales: localeResults,
    status: localeResults.some((result) => result.status === "failed") ? "failed" : "completed",
    window
  };
}
