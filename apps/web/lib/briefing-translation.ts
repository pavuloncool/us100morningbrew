import type { Locale, MorningBrew } from "@us100/contracts";
import {
  createOpenAIResponsesGenerationClientFromEnv,
  createStructuredOutputTranslator,
  type BriefingTranslator
} from "@us100/research";

import {
  getBriefingRepository,
  listBriefingRecords,
  publishBriefing,
  saveBriefing
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
  translator?: BriefingTranslator;
};

export function canonicalDailySlug(date: string): string {
  return `${date}-us100-morning-brew`;
}

export function translationDraftSlug(date: string, targetLocale: Locale): string {
  return `${canonicalDailySlug(date)}-${targetLocale}-translation`;
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
          slug: input.targetSlug ?? canonicalDailySlug(input.sourceBriefing.date),
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
    targetSlug: options.slug ?? canonicalDailySlug(sourceBriefing.date),
    targetStatus: options.status ?? "draft"
  });
}

async function getLatestPublishedPolishBriefing(date: string | undefined): Promise<MorningBrew> {
  const records = await listBriefingRecords("pl", "published");
  const source = date
    ? records.find((record) => record.briefing.date === date)
    : records[0];

  if (!source) {
    throw new Error(date ? `No published PL briefing found for ${date}.` : "No published PL briefing found.");
  }

  return source.briefing;
}

export async function publishEnglishTranslationFromLatestPolish(
  options: PublishEnglishTranslationOptions = {}
): Promise<MorningBrew> {
  const sourceBriefing = await getLatestPublishedPolishBriefing(options.date);
  const now = options.now ?? new Date();
  const translatedDraft = await translateBriefing(sourceBriefing, "en", {
    env: options.env,
    publishedAt: null,
    slug: translationDraftSlug(sourceBriefing.date, "en"),
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
