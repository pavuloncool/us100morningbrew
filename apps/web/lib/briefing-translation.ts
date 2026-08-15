import type { Locale, MorningBrew } from "@us100/contracts";
import {
  createOpenAIResponsesGenerationClientFromEnv,
  createStructuredOutputTranslator,
  type BriefingTranslator
} from "@us100/research";

import {
  briefingReportType,
  canonicalBriefingSlug,
  getBriefingRepository,
  listBriefingRecords,
  publishBriefing,
  saveBriefing,
  type BriefingReportType
} from "./briefings";

type TranslationEnv = Record<string, string | undefined>;

export type TranslateBriefingOptions = {
  env?: TranslationEnv;
  publishedAt?: string | null;
  slug?: string;
  status?: Extract<MorningBrew["status"], "draft" | "published">;
  translator?: BriefingTranslator;
};

export type PublishEnglishTranslationOptions = {
  date?: string;
  env?: TranslationEnv;
  now?: Date;
  reportType?: BriefingReportType;
  translator?: BriefingTranslator;
};

export function canonicalDailySlug(date: string): string {
  return canonicalBriefingSlug(date, "daily");
}

export function canonicalWeeklySlug(date: string): string {
  return canonicalBriefingSlug(date, "weekly");
}

export function translationDraftSlug(
  date: string,
  targetLocale: Locale,
  reportType: BriefingReportType = "daily"
): string {
  return `${canonicalBriefingSlug(date, reportType)}-${targetLocale}-translation`;
}

export function createBriefingTranslatorFromEnv(
  env: TranslationEnv = process.env
): BriefingTranslator {
  const provider =
    env.US100_GENERATION_PROVIDER ?? (env.NODE_ENV === "production" ? "openai" : "fixture");

  if (provider === "fixture") {
    return {
      async translate(input) {
        return {
          ...input.sourceBriefing,
          language: input.targetLocale,
          publishedAt: input.targetStatus === "draft" ? null : input.publishedAt ?? null,
          slug:
            input.targetSlug ??
            canonicalBriefingSlug(
              input.sourceBriefing.date,
              briefingReportType(input.sourceBriefing)
            ),
          status: input.targetStatus ?? "draft"
        };
      }
    };
  }

  if (provider !== "openai") {
    throw new Error(`Unsupported US100_GENERATION_PROVIDER: ${provider}.`);
  }

  return createStructuredOutputTranslator(createOpenAIResponsesGenerationClientFromEnv(env));
}

export async function translateBriefing(
  sourceBriefing: MorningBrew,
  targetLocale: Locale,
  options: TranslateBriefingOptions = {}
): Promise<MorningBrew> {
  const translator = options.translator ?? createBriefingTranslatorFromEnv(options.env);
  return translator.translate({
    publishedAt: options.publishedAt ?? null,
    sourceBriefing,
    targetLocale,
    targetSlug:
      options.slug ??
      canonicalBriefingSlug(sourceBriefing.date, briefingReportType(sourceBriefing)),
    targetStatus: options.status ?? "draft"
  });
}

export function selectPublishedPolishBriefing(
  records: Awaited<ReturnType<typeof listBriefingRecords>>,
  options: Pick<PublishEnglishTranslationOptions, "date" | "reportType"> = {}
): MorningBrew | null {
  const source = records.find((record) => {
    if (options.date && record.briefing.date !== options.date) {
      return false;
    }
    if (options.reportType && briefingReportType(record.briefing) !== options.reportType) {
      return false;
    }
    return true;
  });

  return source?.briefing ?? null;
}

async function getLatestPublishedPolishBriefing(
  options: Pick<PublishEnglishTranslationOptions, "date" | "reportType"> = {}
): Promise<MorningBrew> {
  const records = await listBriefingRecords("pl", "published");
  const source = selectPublishedPolishBriefing(records, options);

  if (!source) {
    const reportLabel = options.reportType ? ` ${options.reportType}` : "";
    throw new Error(
      options.date
        ? `No published PL${reportLabel} briefing found for ${options.date}.`
        : `No published PL${reportLabel} briefing found.`
    );
  }

  return source;
}

export async function publishEnglishTranslationFromLatestPolish(
  options: PublishEnglishTranslationOptions = {}
): Promise<MorningBrew> {
  const sourceBriefing = await getLatestPublishedPolishBriefing({
    date: options.date,
    reportType: options.reportType
  });
  const reportType = options.reportType ?? briefingReportType(sourceBriefing);
  const now = options.now ?? new Date();
  const translatedDraft = await translateBriefing(sourceBriefing, "en", {
    env: options.env,
    publishedAt: null,
    slug: translationDraftSlug(sourceBriefing.date, "en", reportType),
    status: "draft",
    translator: options.translator
  });
  const savedDraft = await saveBriefing(translatedDraft);
  return publishBriefing(savedDraft.slug, "en", now.toISOString());
}

export async function saveTranslatedDraft(
  sourceBriefing: MorningBrew,
  targetLocale: Locale,
  options: TranslateBriefingOptions = {}
): Promise<MorningBrew> {
  const translated = await translateBriefing(sourceBriefing, targetLocale, options);
  return getBriefingRepository().saveBriefing(translated);
}
