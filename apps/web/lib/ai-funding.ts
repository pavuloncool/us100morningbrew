import type { AiFundingDashboard, AiFundingMetricSource } from "@us100/contracts";
import {
  buildAiFundingDashboard,
  defaultAiFundingBonds,
  defaultAiFundingIssuers
} from "@us100/research";
import {
  createAiFundingRepositoryFromEnv,
  type AiFundingRepository
} from "@us100/storage";

function publicFixtureSource(
  asOf: string,
  source: string,
  sourceUrl: string,
  sourceType: AiFundingMetricSource["sourceType"],
  completeness: AiFundingMetricSource["completeness"] = "partial"
): AiFundingMetricSource {
  return {
    completeness,
    confidence: completeness === "unavailable" ? "low" : "medium",
    lastUpdated: asOf,
    source,
    sourceTimestamp: asOf,
    sourceType,
    sourceUrl
  };
}

export function createPublicOnlyAiFundingFallback(now = new Date()): AiFundingDashboard {
  const asOf = now.toISOString();
  const finraSource = publicFixtureSource(
    asOf,
    "FINRA public fixed income data placeholder; configure public feed ingestion for live observations",
    "https://www.finra.org/finra-data/fixed-income",
    "finra_trace",
    "unavailable"
  );
  const secSource = publicFixtureSource(
    asOf,
    "SEC EDGAR companyfacts placeholder; configure SEC ingestion for live quarterly metrics",
    "https://www.sec.gov/search-filings/edgar-application-programming-interfaces",
    "sec_edgar",
    "unavailable"
  );

  return buildAiFundingDashboard({
    asOf,
    bondObservations: defaultAiFundingBonds.map((bond) => ({
      bondId: bond.id,
      corporateYield: null,
      observedAt: asOf,
      price: null,
      source: finraSource,
      tradeDate: asOf.slice(0, 10),
      volumeUsd: null
    })),
    bonds: defaultAiFundingBonds,
    debtIssues: [],
    events: defaultAiFundingIssuers.map((issuer) => ({
      date: asOf.slice(0, 10),
      expectedTime: null,
      id: `${issuer.id}-next-public-filing-check`,
      issuerId: issuer.id,
      source: secSource,
      title: `${issuer.ticker}: next SEC/IR update check`,
      type: "guidance_update",
      watchFields: [
        "capex actual",
        "capex guidance",
        "free cash flow",
        "operating cash flow",
        "AI/data-center commitments",
        "debt financing comments"
      ]
    })),
    issuers: defaultAiFundingIssuers,
    previousSpreads: [],
    quarterlyMetrics: [],
    treasuryYields: []
  });
}

const fallbackRepository: AiFundingRepository = {
  async getLatestDashboard() {
    return createPublicOnlyAiFundingFallback();
  },
  async saveDashboard(dashboard) {
    return dashboard;
  }
};

const aiFundingRepository = createAiFundingRepositoryFromEnv(fallbackRepository);

export function getAiFundingRepository(): AiFundingRepository {
  return aiFundingRepository;
}

export async function getLatestAiFundingDashboard(): Promise<AiFundingDashboard> {
  try {
    return (await aiFundingRepository.getLatestDashboard()) ?? createPublicOnlyAiFundingFallback();
  } catch (error) {
    console.warn("[ai-funding] Falling back to public-only placeholder dashboard", error);
    return createPublicOnlyAiFundingFallback();
  }
}
