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
  type ResearchRunRepository
} from "@us100/storage";

const fixtureRepository: BriefingRepository = {
  async getBriefingBySlug(slug, locale) {
    return getFixtureBriefingBySlug(slug, locale);
  },
  async getLatestBriefing(locale) {
    return getLatestFixtureBriefing(locale);
  },
  async listBriefings(locale, options) {
    return listFixtureBriefings(locale).slice(0, options?.limit ?? 50);
  },
  async saveBriefing(briefing) {
    return briefing;
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

export async function listBriefings(locale: Locale): Promise<MorningBrew[]> {
  return briefingRepository.listBriefings(locale);
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

export async function saveBriefing(briefing: MorningBrew): Promise<MorningBrew> {
  return briefingRepository.saveBriefing(briefing);
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
    archiveTitle: "Wszystkie briefingi US100 Morning Brew",
    latest: "Najnowszy",
    mainNavigation: "Główne",
    skipToContent: "Przejdź do treści"
  },
  en: {
    archive: "Archive",
    archiveDescription:
      "Every briefing is rendered from structured data, with a permalink and the full set of product-required sections.",
    archiveTitle: "All US100 Morning Brew briefings",
    latest: "Latest",
    mainNavigation: "Main",
    skipToContent: "Skip to content"
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
