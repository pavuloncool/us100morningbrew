import type { AiFundingBond, AiFundingDashboard } from "@us100/contracts";
import {
  buildAiFundingDashboard,
  createFinraQueryCorporateBondProvider,
  createSecEdgarCompanyFinancialsProvider,
  createTreasuryXmlYieldProvider,
  defaultAiFundingBonds,
  defaultAiFundingIssuers
} from "@us100/research";

import { getAiFundingRepository } from "./ai-funding";

type AiFundingAutomationEnv = Record<string, string | undefined>;

export type AiFundingAutomationResult = {
  dashboard: AiFundingDashboard;
  saved: boolean;
  sourceBreakdown: {
    bondObservations: number;
    debtIssues: number;
    events: number;
    quarterlyMetrics: number;
    treasuryYields: number;
  };
  status: "completed";
};

function todayIsoDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function parseConfiguredBonds(env: AiFundingAutomationEnv): AiFundingBond[] {
  const value = env.US100_AI_FUNDING_BONDS_JSON;
  if (!value) {
    return defaultAiFundingBonds;
  }
  const parsed = JSON.parse(value) as AiFundingBond[];
  return parsed;
}

function secUserAgent(env: AiFundingAutomationEnv): string | null {
  return env.US100_SEC_USER_AGENT ?? env.SEC_USER_AGENT ?? null;
}

export async function runAiFundingAutomation(
  input: { date?: string; now?: Date } = {},
  env: AiFundingAutomationEnv = process.env
): Promise<AiFundingAutomationResult> {
  const now = input.now ?? new Date();
  const date = input.date ?? todayIsoDate(now);
  const asOf = now.toISOString();
  const bonds = parseConfiguredBonds(env);
  const treasuryProvider = createTreasuryXmlYieldProvider({ now: () => now });
  const treasuryYields = await treasuryProvider.getTreasuryYields({ date });
  const finraDataset = env.US100_FINRA_DATASET;
  const bondObservations =
    finraDataset && bonds.some((bond) => bond.identifier.type !== "other")
      ? await createFinraQueryCorporateBondProvider({ dataset: finraDataset }).getBondObservations({
          bonds: bonds.filter((bond) => bond.identifier.type !== "other"),
          date
        })
      : [];
  const quarterlyMetrics = secUserAgent(env)
    ? await createSecEdgarCompanyFinancialsProvider({
        now: () => now,
        userAgent: secUserAgent(env) ?? ""
      }).getQuarterlyMetrics({ issuers: defaultAiFundingIssuers })
    : [];
  const dashboard = buildAiFundingDashboard({
    asOf,
    bondObservations,
    bonds,
    debtIssues: [],
    events: [],
    issuers: defaultAiFundingIssuers,
    previousSpreads: [],
    quarterlyMetrics,
    treasuryYields
  });

  await getAiFundingRepository().saveDashboard(dashboard);

  return {
    dashboard,
    saved: true,
    sourceBreakdown: {
      bondObservations: bondObservations.length,
      debtIssues: 0,
      events: 0,
      quarterlyMetrics: quarterlyMetrics.length,
      treasuryYields: treasuryYields.length
    },
    status: "completed"
  };
}
