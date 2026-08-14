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
  canonicalDailySlug,
  createBriefingTranslatorFromEnv,
  translationDraftSlug,
  translateBriefing
} from "./briefing-translation";
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
  minEvidenceSources?: number;
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

function shouldTranslateEnglishFromPolish(locales: AppLocale[], env: AutomationEnv): boolean {
  return (
    env.US100_EN_FROM_PL_TRANSLATION !== "false" &&
    locales.includes("pl") &&
    locales.includes("en")
  );
}

function sourceBreakdown(sources: Array<{ id: string }>): Record<string, number> {
  return sources.reduce<Record<string, number>>(
    (breakdown, source) => {
      const bucket = source.id.startsWith("stooq-")
        ? "stooq"
        : source.id.startsWith("fred-")
          ? "fred"
          : source.id.startsWith("news-")
            ? "news"
            : "other";
      breakdown[bucket] = (breakdown[bucket] ?? 0) + 1;
      return breakdown;
    },
    { fred: 0, news: 0, other: 0, stooq: 0 }
  );
}

function snapshotErrors(
  snapshots: Array<{ payload: Record<string, unknown>; source: string }>
): Array<{ error: string; label: string | null; source: string }> {
  return snapshots
    .map((snapshot) => {
      const error = snapshot.payload.error;
      if (typeof error !== "string") {
        return null;
      }
      return {
        error,
        label: typeof snapshot.payload.label === "string" ? snapshot.payload.label : null,
        source: snapshot.source
      };
    })
    .filter((item): item is { error: string; label: string | null; source: string } => item !== null)
    .slice(0, 8);
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
  const translateEnglishFromPolish = shouldTranslateEnglishFromPolish(locales, env);
  const pipelineLocales = translateEnglishFromPolish
    ? locales.filter((locale) => locale !== "en")
    : locales;
  let polishSourceBriefing: MorningBrew | null = null;

  for (const locale of pipelineLocales) {
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
      minEvidenceSources: options.minEvidenceSources,
      now,
      runId: claim.run.id,
      slugSuffix: options.slugSuffix,
      targetStatus: targetStatusFromEnv(env)
    });

    if (result.status === "succeeded") {
      if (locale === "pl") {
        polishSourceBriefing = result.savedBriefing ?? result.briefing;
      }
      await researchRunRepository.completeResearchRun(claim.run.id, {
        metrics: {
          evidenceSnapshots: result.evidencePack.snapshots.length,
          evidenceSources: result.evidencePack.sources.length,
          idempotencyScope: options.idempotencyScope ?? "cron",
          issues: result.quality.issues,
          runSource,
          slug: result.briefing.slug,
          snapshotErrors: snapshotErrors(result.evidencePack.snapshots),
          sourceBreakdown: sourceBreakdown(result.evidencePack.sources),
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
        idempotencyScope: options.idempotencyScope ?? "cron",
        issues: result.quality.issues,
        runSource,
        snapshotErrors: result.evidencePack ? snapshotErrors(result.evidencePack.snapshots) : [],
        sourceBreakdown: result.evidencePack ? sourceBreakdown(result.evidencePack.sources) : null,
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

  if (translateEnglishFromPolish) {
    const locale = "en" satisfies AppLocale;
    const idempotencyKey = options.idempotencyScope
      ? `morning-brew:${date}:${locale}:${options.idempotencyScope}`
      : `morning-brew:${date}:${locale}`;
    const claim = await researchRunRepository.claimResearchRun({
      idempotencyKey,
      locale,
      metrics: {
        source: runSource,
        translatedFromLocale: "pl"
      },
      runDate: date
    });

    if (!claim.acquired) {
      localeResults.push({
        idempotencyKey,
        locale,
        runId: claim.run.id,
        status: "skipped_duplicate"
      });
    } else if (!polishSourceBriefing) {
      await researchRunRepository.completeResearchRun(claim.run.id, {
        errorMessage: "EN translation skipped because the PL source briefing was not generated.",
        metrics: {
          idempotencyScope: options.idempotencyScope ?? "cron",
          runSource,
          translatedFromLocale: "pl"
        },
        status: "failed"
      });
      localeResults.push({
        idempotencyKey,
        locale,
        runId: claim.run.id,
        status: "failed"
      });
    } else {
      const runStartedAtMs = Date.now();
      const timingsMs: Record<string, number> = {};
      try {
        const translateStartedAtMs = Date.now();
        const translatedBriefing = await translateBriefing(polishSourceBriefing, "en", {
          env,
          slug: options.slugSuffix
            ? `${translationDraftSlug(date, "en")}-${options.slugSuffix}`
            : canonicalDailySlug(date),
          status: targetStatusFromEnv(env),
          translator: createBriefingTranslatorFromEnv(env)
        });
        timingsMs.generate = Date.now() - translateStartedAtMs;
        const saveStartedAtMs = Date.now();
        const savedBriefing = await briefingRepository.saveBriefing(translatedBriefing);
        timingsMs.save = Date.now() - saveStartedAtMs;
        timingsMs.total = Date.now() - runStartedAtMs;
        await researchRunRepository.completeResearchRun(claim.run.id, {
          metrics: {
            evidenceSources: savedBriefing.sources.length,
            idempotencyScope: options.idempotencyScope ?? "cron",
            runSource,
            slug: savedBriefing.slug,
            sourceBreakdown: sourceBreakdown(savedBriefing.sources),
            status: savedBriefing.status,
            timingsMs,
            translatedFromLocale: "pl",
            translatedFromSlug: polishSourceBriefing.slug
          },
          status: statusForBriefing(savedBriefing)
        });
        localeResults.push({
          idempotencyKey,
          locale,
          runId: claim.run.id,
          status: "completed"
        });
      } catch (error) {
        timingsMs.total = Date.now() - runStartedAtMs;
        const errorMessage = error instanceof Error ? error.message : String(error);
        await researchRunRepository.completeResearchRun(claim.run.id, {
          errorMessage,
          metrics: {
            idempotencyScope: options.idempotencyScope ?? "cron",
            runSource,
            timingsMs,
            translatedFromLocale: "pl",
            translatedFromSlug: polishSourceBriefing.slug
          },
          status: "failed"
        });
        localeResults.push({
          idempotencyKey,
          locale,
          runId: claim.run.id,
          status: "failed"
        });
      }
    }
  }

  return {
    date,
    force,
    locales: localeResults,
    status: localeResults.some((result) => result.status === "failed") ? "failed" : "completed",
    window
  };
}
