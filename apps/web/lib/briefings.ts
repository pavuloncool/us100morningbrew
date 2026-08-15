import type {
  BriefingSection,
  Locale,
  MorningBrew,
  SignalImpact,
  WatchItem
} from "@us100/contracts";
import {
  getBriefingBySlug as getFixtureBriefingBySlug,
  getLatestBriefing as getLatestFixtureBriefing,
  listBriefings as listFixtureBriefings
} from "@us100/research";
import {
  createBriefingRepositoryFromEnv,
  createNoopResearchRunRepository,
  createResearchRunRepositoryFromEnv,
  type BriefingRepository,
  type BriefingStatus,
  type ResearchRunRepository,
  type SaveRenderArtifactInput,
  type StoredBriefingRecord,
  type StoredResearchRun,
  type StoredRenderArtifact
} from "@us100/storage";

const fixtureRepository: BriefingRepository = {
  async getBriefingRecordBySlug(slug, locale, options) {
    const briefing = getFixtureBriefingBySlug(slug, locale);
    if (!briefing) {
      return null;
    }
    if (options?.status && options.status !== "any" && briefing.status !== options.status) {
      return null;
    }
    return {
      briefing,
      id: `${briefing.slug}:${briefing.language}`,
      language: briefing.language,
      publishedAt: briefing.publishedAt,
      slug: briefing.slug,
      status: briefing.status
    };
  },
  async getBriefingBySlug(slug, locale) {
    return getFixtureBriefingBySlug(slug, locale);
  },
  async getLatestBriefing(locale) {
    return getLatestFixtureBriefing(locale);
  },
  async listBriefingRecords(locale, options) {
    return listFixtureBriefings(locale)
      .filter((briefing) => {
        if (!options?.status || options.status === "published") {
          return briefing.status === "published";
        }
        if (options.status === "any") {
          return true;
        }
        return briefing.status === options.status;
      })
      .slice(0, options?.limit ?? 50)
      .map((briefing) => ({
        briefing,
        id: `${briefing.slug}:${briefing.language}`,
        language: briefing.language,
        publishedAt: briefing.publishedAt,
        slug: briefing.slug,
        status: briefing.status
      }));
  },
  async listBriefings(locale, options) {
    return listFixtureBriefings(locale).slice(0, options?.limit ?? 50);
  },
  async publishBriefing(slug, locale) {
    const briefing = getFixtureBriefingBySlug(slug, locale);
    if (!briefing) {
      throw new Error(`Briefing ${slug}/${locale} was not found.`);
    }
    return {
      ...briefing,
      publishedAt: briefing.publishedAt ?? new Date().toISOString(),
      status: "published"
    };
  },
  async saveBriefing(briefing) {
    return briefing;
  },
  async saveRenderArtifact(input) {
    return {
      artifactPath: input.artifactPath ?? null,
      artifactUrl: input.artifactUrl ?? null,
      briefingId: input.briefingId,
      createdAt: new Date().toISOString(),
      format: input.format,
      id: `${input.briefingId}:${input.format}:${input.language}`,
      language: input.language,
      metadata: input.metadata ?? {}
    };
  }
};

const briefingRepository = createBriefingRepositoryFromEnv(fixtureRepository);
const researchRunRepository = createResearchRunRepositoryFromEnv(
  createNoopResearchRunRepository()
);

export function getBriefingRepository(): BriefingRepository {
  return briefingRepository;
}

export function getResearchRunRepository(): ResearchRunRepository {
  return researchRunRepository;
}

export async function listResearchRuns(limit = 20): Promise<StoredResearchRun[]> {
  return researchRunRepository.listResearchRuns({ limit });
}

export async function listBriefings(locale: Locale): Promise<MorningBrew[]> {
  return briefingRepository.listBriefings(locale);
}

export type BriefingReportType = "daily" | "weekly";
export type BriefingArchiveFilter = BriefingReportType | "all";

export function briefingReportType(briefing: MorningBrew): BriefingReportType {
  return briefing.weeklySummary ? "weekly" : "daily";
}

export function isBriefingReportType(value: string): value is BriefingReportType {
  return value === "daily" || value === "weekly";
}

export function isBriefingArchiveFilter(value: string): value is BriefingArchiveFilter {
  return value === "all" || value === "daily" || value === "weekly";
}

export function canonicalBriefingSlug(date: string, reportType: BriefingReportType): string {
  return reportType === "weekly"
    ? `${date}-us100-weekly-short-thesis`
    : `${date}-us100-morning-brew`;
}

export async function listBriefingsByReportType(
  locale: Locale,
  reportType: BriefingArchiveFilter
): Promise<MorningBrew[]> {
  const briefings = await listBriefings(locale);
  if (reportType === "all") {
    return briefings;
  }
  return briefings.filter((briefing) => briefingReportType(briefing) === reportType);
}

export async function getLatestDailyBriefing(locale: Locale): Promise<MorningBrew | null> {
  const [briefing] = await listBriefingsByReportType(locale, "daily");
  return briefing ?? null;
}

export async function listBriefingRecords(
  locale: Locale,
  status: BriefingStatus | "any" = "published"
): Promise<StoredBriefingRecord[]> {
  return briefingRepository.listBriefingRecords(locale, { status });
}

export async function getLatestBriefing(locale: Locale): Promise<MorningBrew | null> {
  return briefingRepository.getLatestBriefing(locale);
}

export async function getBriefingBySlug(
  slug: string,
  locale: Locale
): Promise<MorningBrew | null> {
  return briefingRepository.getBriefingBySlug(slug, locale);
}

export async function getBriefingRecordBySlug(
  slug: string,
  locale: Locale,
  status: BriefingStatus | "any" = "published"
): Promise<StoredBriefingRecord | null> {
  return briefingRepository.getBriefingRecordBySlug(slug, locale, { status });
}

export async function publishBriefing(
  slug: string,
  locale: Locale,
  publishedAt?: string
): Promise<MorningBrew> {
  return briefingRepository.publishBriefing(slug, locale, publishedAt);
}

export async function saveBriefing(briefing: MorningBrew): Promise<MorningBrew> {
  return briefingRepository.saveBriefing(briefing);
}

export async function saveRenderArtifact(
  input: SaveRenderArtifactInput
): Promise<StoredRenderArtifact> {
  return briefingRepository.saveRenderArtifact(input);
}

export const appLocales = ["pl", "en"] as const satisfies readonly Locale[];
export type AppLocale = (typeof appLocales)[number];

export function isAppLocale(value: string): value is AppLocale {
  return appLocales.includes(value as AppLocale);
}

export function formatDate(date: string, locale: AppLocale = "pl"): string {
  return new Intl.DateTimeFormat(locale === "pl" ? "pl-PL" : "en-GB", {
    dateStyle: "long",
    timeZone: "Europe/Warsaw"
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export function impactLabel(impact: SignalImpact, locale: AppLocale = "pl"): string {
  switch (impact) {
    case "short_thesis_strengthened":
      return locale === "pl" ? "Wzmacnia tezę short" : "Strengthens short thesis";
    case "short_thesis_weakened":
      return locale === "pl" ? "Osłabia tezę short" : "Weakens short thesis";
    case "mixed":
      return locale === "pl" ? "Mieszany sygnał" : "Mixed signal";
    case "unchanged":
      return locale === "pl" ? "Bez zmiany" : "Unchanged";
  }
}

export function convictionLabel(
  conviction: MorningBrew["verdict"]["conviction"],
  locale: AppLocale = "pl"
): string {
  switch (conviction) {
    case "low":
      return locale === "pl" ? "Niska" : "Low";
    case "medium":
      return locale === "pl" ? "Średnia" : "Medium";
    case "high":
      return locale === "pl" ? "Wysoka" : "High";
  }
}

export const uiCopy = {
  pl: {
    archive: "Archiwum",
    archiveDescription:
      "Każdy wpis jest renderowany z danych strukturalnych, z permalinkiem i kompletem sekcji wymaganych przez produkt.",
    archiveFilterAll: "Wszystkie",
    archiveFilterDaily: "Daily",
    archiveFilterWeekly: "Weekly",
    archiveTitle: "Wszystkie briefingi US100 Morning Brew",
    dailyReport: "Daily",
    latest: "Najnowszy",
    mainNavigation: "Główne",
    reportOfWeek: "Raport z tygodnia",
    skipToContent: "Przejdź do treści",
    weeklyDescription:
      "Sobotnie raporty syntetyzują ostatni tydzień rynku przez pryzmat tezy short.",
    weeklyReport: "Weekly",
    weeklyTitle: "Raporty z tygodnia"
  },
  en: {
    archive: "Archive",
    archiveDescription:
      "Every briefing is rendered from structured data, with a permalink and the full set of product-required sections.",
    archiveFilterAll: "All",
    archiveFilterDaily: "Daily",
    archiveFilterWeekly: "Weekly",
    archiveTitle: "All US100 Morning Brew briefings",
    dailyReport: "Daily",
    latest: "Latest",
    mainNavigation: "Main",
    reportOfWeek: "Weekly report",
    skipToContent: "Skip to content",
    weeklyDescription:
      "Saturday reports summarize the latest market week through the short thesis.",
    weeklyReport: "Weekly",
    weeklyTitle: "Weekly reports"
  }
} as const;

export const sectionOrder = [
  "priceAction",
  "breadth",
  "aiSemis",
  "ratesFed",
  "volatility"
] as const satisfies ReadonlyArray<keyof MorningBrew["sections"]>;

export type OrderedSection = {
  id: keyof MorningBrew["sections"];
  section: BriefingSection;
};

export function orderedSections(briefing: MorningBrew): OrderedSection[] {
  return sectionOrder.map((id) => ({ id, section: briefing.sections[id] }));
}

export function watchItemKey(item: WatchItem): string {
  return `${item.label}:${item.trigger}`;
}
