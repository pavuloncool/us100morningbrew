import type {
  AiFundingAlert,
  AiFundingBond,
  AiFundingBondObservation,
  AiFundingDashboard,
  AiFundingDebtIssue,
  AiFundingEvent,
  AiFundingIssuer,
  AiFundingMetricSource,
  AiFundingQuarterlyMetric,
  AiFundingSpreadSnapshot,
  AiFundingStressComponent,
  AiFundingStressScore,
  AiFundingStressState,
  AiFundingTenorBucket,
  AiFundingTreasuryYield
} from "@us100/contracts";
import {
  AiFundingDashboardSchema,
  AiFundingMetricSourceSchema,
  AiFundingQuarterlyMetricSchema
} from "@us100/contracts";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type TreasuryYieldProvider = {
  getTreasuryYields(input: { date: string }): Promise<AiFundingTreasuryYield[]>;
};

export type CorporateBondMarketProvider = {
  getBondObservations(input: {
    bonds: AiFundingBond[];
    date: string;
  }): Promise<AiFundingBondObservation[]>;
};

export type DebtIssuanceFilingsProvider = {
  getRecentDebtIssues(input: {
    issuers: AiFundingIssuer[];
    since: string;
    until: string;
  }): Promise<AiFundingDebtIssue[]>;
};

export type CompanyFinancialsProvider = {
  getQuarterlyMetrics(input: {
    fiscalPeriods?: number;
    issuers: AiFundingIssuer[];
  }): Promise<AiFundingQuarterlyMetric[]>;
};

export type IssuerEventsProvider = {
  getEvents(input: {
    issuers: AiFundingIssuer[];
    since: string;
    until: string;
  }): Promise<AiFundingEvent[]>;
};

export type AiFundingThresholds = {
  concessionElevatedBp: number;
  coverageHealthy: number;
  coverageVeryStrong: number;
  coverageWarning: number;
  spreadElevatedBp: number;
  spreadStableBp: number;
};

export type AiFundingDashboardInput = {
  alerts?: AiFundingAlert[];
  asOf: string;
  bondObservations: AiFundingBondObservation[];
  bonds: AiFundingBond[];
  debtIssues: AiFundingDebtIssue[];
  events: AiFundingEvent[];
  issuers: AiFundingIssuer[];
  previousSpreads?: AiFundingSpreadSnapshot[];
  quarterlyMetrics: AiFundingQuarterlyMetric[];
  thresholds?: Partial<AiFundingThresholds>;
  treasuryYields: AiFundingTreasuryYield[];
};

const defaultThresholds: AiFundingThresholds = {
  concessionElevatedBp: 20,
  coverageHealthy: 3,
  coverageVeryStrong: 4,
  coverageWarning: 2,
  spreadElevatedBp: 20,
  spreadStableBp: 10
};

export const defaultAiFundingIssuers: AiFundingIssuer[] = [
  { cik: "0000789019", enabled: true, id: "msft", name: "Microsoft", ticker: "MSFT" },
  { cik: "0001018724", enabled: true, id: "amzn", name: "Amazon", ticker: "AMZN" },
  { cik: "0001652044", enabled: true, id: "googl", name: "Alphabet", ticker: "GOOGL" },
  { cik: "0001326801", enabled: true, id: "meta", name: "Meta", ticker: "META" },
  { cik: "0001341439", enabled: true, id: "orcl", name: "Oracle", ticker: "ORCL" }
];

export const defaultAiFundingBonds: AiFundingBond[] = defaultAiFundingIssuers.map((issuer) => ({
  active: true,
  coupon: null,
  currency: "USD",
  id: `${issuer.id}-10y-public-placeholder`,
  identifier: { type: "other", value: `${issuer.ticker} representative 10Y public bond` },
  issuerId: issuer.id,
  maturityDate: "2035-01-01",
  tenorBucket: "10Y"
}));

function metricSource(
  input: Omit<AiFundingMetricSource, "lastUpdated" | "sourceTimestamp"> & {
    lastUpdated?: string;
    sourceTimestamp?: string | null;
  }
): AiFundingMetricSource {
  return AiFundingMetricSourceSchema.parse({
    ...input,
    lastUpdated: input.lastUpdated ?? new Date().toISOString(),
    sourceTimestamp: input.sourceTimestamp ?? null
  });
}

export function unavailablePublicSource(metric: string, asOf: string): AiFundingMetricSource {
  return metricSource({
    completeness: "unavailable",
    confidence: "low",
    lastUpdated: asOf,
    source: `${metric} is not available from the configured public sources`,
    sourceTimestamp: null,
    sourceType: "public_web",
    sourceUrl: null
  });
}

export function creditSpreadBp(
  corporateYieldPct: number | null,
  treasuryYieldPct: number | null
): number | null {
  if (corporateYieldPct === null || treasuryYieldPct === null) {
    return null;
  }
  return Math.round((corporateYieldPct - treasuryYieldPct) * 100);
}

export function median(values: number[]): number | null {
  const sorted = values.filter(Number.isFinite).sort((left, right) => left - right);
  if (sorted.length === 0) {
    return null;
  }
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? null;
  }
  const left = sorted[mid - 1];
  const right = sorted[mid];
  return left === undefined || right === undefined ? null : (left + right) / 2;
}

function bpLabel(value: number | null): string {
  if (value === null) {
    return "N/A";
  }
  return `${value > 0 ? "+" : ""}${Math.round(value)} bp`;
}

function bpLevelLabel(value: number | null): string {
  return value === null ? "N/A" : `${Math.round(value)} bp`;
}

function multipleLabel(value: number | null): string {
  return value === null ? "N/A" : `${value.toFixed(1)}x`;
}

function pctLabel(value: number | null): string {
  return value === null ? "N/A" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function cashTrendLabel(value: number | null): string {
  if (value === null) {
    return "N/A";
  }
  if (value > 0) {
    return "up";
  }
  if (value < 0) {
    return "down";
  }
  return "flat";
}

function tenorRank(tenor: AiFundingTenorBucket): number {
  switch (tenor) {
    case "5Y":
      return 5;
    case "10Y":
      return 10;
    case "30Y":
      return 30;
  }
}

export function nearestTreasuryYield(
  targetTenor: AiFundingTenorBucket,
  yields: AiFundingTreasuryYield[]
): AiFundingTreasuryYield | null {
  return (
    [...yields].sort(
      (left, right) =>
        Math.abs(tenorRank(left.tenor) - tenorRank(targetTenor)) -
        Math.abs(tenorRank(right.tenor) - tenorRank(targetTenor))
    )[0] ?? null
  );
}

function priorSpreadDelta(
  current: number | null,
  previous: AiFundingSpreadSnapshot[] | undefined,
  bondId: string,
  key: "spreadChange1d" | "spreadChange5d" | "spreadChange20d"
): number | null {
  if (current === null || !previous) {
    return null;
  }
  const delta = previous.find((snapshot) => snapshot.bondId === bondId)?.[key];
  return typeof delta === "number" ? delta : null;
}

export function buildSpreadSnapshots(input: {
  asOf: string;
  bondObservations: AiFundingBondObservation[];
  bonds: AiFundingBond[];
  previousSpreads?: AiFundingSpreadSnapshot[];
  treasuryYields: AiFundingTreasuryYield[];
}): AiFundingSpreadSnapshot[] {
  return input.bondObservations.map((observation) => {
    const bond = input.bonds.find((item) => item.id === observation.bondId);
    const treasury = bond ? nearestTreasuryYield(bond.tenorBucket, input.treasuryYields) : null;
    const spread = creditSpreadBp(observation.corporateYield, treasury?.yield ?? null);
    return {
      benchmarkTreasuryYield: treasury?.yield ?? null,
      bondId: observation.bondId,
      corporateYield: observation.corporateYield,
      issuerId: bond?.issuerId ?? "msft",
      source:
        spread === null
          ? unavailablePublicSource("Credit spread", input.asOf)
          : metricSource({
              completeness: "complete",
              confidence: observation.source.confidence,
              lastUpdated: input.asOf,
              source: `${observation.source.source}; ${treasury?.source.source ?? "Treasury benchmark"}`,
              sourceTimestamp: observation.observedAt,
              sourceType: "derived",
              sourceUrl: observation.source.sourceUrl
            }),
      spreadBp: spread,
      spreadChange1d: priorSpreadDelta(
        spread,
        input.previousSpreads,
        observation.bondId,
        "spreadChange1d"
      ),
      spreadChange5d: priorSpreadDelta(
        spread,
        input.previousSpreads,
        observation.bondId,
        "spreadChange5d"
      ),
      spreadChange20d: priorSpreadDelta(
        spread,
        input.previousSpreads,
        observation.bondId,
        "spreadChange20d"
      ),
      timestamp: input.asOf
    };
  });
}

export function scoreCreditSpreadTrend(
  change20d: number | null,
  thresholds: AiFundingThresholds = defaultThresholds
): number | null {
  if (change20d === null) {
    return null;
  }
  if (change20d < 0) {
    return 0;
  }
  if (change20d < thresholds.spreadStableBp) {
    return 1;
  }
  if (change20d <= thresholds.spreadElevatedBp) {
    return 2;
  }
  return 3;
}

export function scoreOrderbookCoverage(
  coverage: number | null,
  thresholds: AiFundingThresholds = defaultThresholds
): number | null {
  if (coverage === null) {
    return null;
  }
  if (coverage > thresholds.coverageVeryStrong) {
    return 0;
  }
  if (coverage >= thresholds.coverageHealthy) {
    return 1;
  }
  if (coverage >= thresholds.coverageWarning) {
    return 2;
  }
  return 3;
}

export function scoreNewIssueConcession(
  concessionBp: number | null,
  thresholds: AiFundingThresholds = defaultThresholds
): number | null {
  if (concessionBp === null) {
    return null;
  }
  if (concessionBp < 5) {
    return 0;
  }
  if (concessionBp < 10) {
    return 1;
  }
  if (concessionBp <= thresholds.concessionElevatedBp) {
    return 2;
  }
  return 3;
}

export function scoreCapexPressure(metric: AiFundingQuarterlyMetric | null): number | null {
  if (!metric) {
    return null;
  }
  const capexGrowth = metric.yoyCapexGrowth ?? metric.qoqCapexGrowth;
  if (capexGrowth === null) {
    return null;
  }
  const fcfPressure =
    metric.freeCashFlow !== null && metric.reportedCapex !== null
      ? metric.freeCashFlow < metric.reportedCapex
      : false;
  if (capexGrowth < 0 && !fcfPressure) {
    return 0;
  }
  if (capexGrowth < 10 && !fcfPressure) {
    return 1;
  }
  if (capexGrowth < 25 || fcfPressure) {
    return 2;
  }
  return 3;
}

function stressState(totalScore: number, availableMaxScore: number): AiFundingStressState {
  if (availableMaxScore < 6) {
    return "insufficient_data";
  }
  const ratio = totalScore / availableMaxScore;
  if (ratio <= 0.25) {
    return "low";
  }
  if (ratio <= 0.5) {
    return "moderate";
  }
  if (ratio <= 0.75) {
    return "high";
  }
  return "severe";
}

function latestIssueMetric(
  issues: AiFundingDebtIssue[],
  key: "coverageRatio" | "newIssueConcessionBp"
): number | null {
  return (
    [...issues]
      .sort((left, right) =>
        (right.pricingDate ?? right.announcementDate ?? "").localeCompare(
          left.pricingDate ?? left.announcementDate ?? ""
        )
      )
      .find((issue) => issue[key] !== null)?.[key] ?? null
  );
}

function latestQuarter(metrics: AiFundingQuarterlyMetric[]): AiFundingQuarterlyMetric | null {
  return [...metrics].sort((left, right) => right.quarter.localeCompare(left.quarter))[0] ?? null;
}

function scoreComponent(
  label: string,
  metric: string,
  score: number | null,
  source: AiFundingMetricSource,
  unavailableReason: string | null
): AiFundingStressComponent {
  return { label, metric, score, source, unavailableReason };
}

function buildScore(input: {
  asOf: string;
  debtIssues: AiFundingDebtIssue[];
  quarterlyMetrics: AiFundingQuarterlyMetric[];
  spreadSnapshots: AiFundingSpreadSnapshot[];
  thresholds: AiFundingThresholds;
}): AiFundingStressScore {
  const medianSpreadChange = median(
    input.spreadSnapshots
      .map((snapshot) => snapshot.spreadChange20d)
      .filter((value): value is number => value !== null)
  );
  const coverage = latestIssueMetric(input.debtIssues, "coverageRatio");
  const concession = latestIssueMetric(input.debtIssues, "newIssueConcessionBp");
  const latestFinancialMetric = latestQuarter(input.quarterlyMetrics);
  const components = [
    scoreComponent(
      "Credit spread trend",
      medianSpreadChange === null ? "N/A" : bpLabel(medianSpreadChange),
      scoreCreditSpreadTrend(medianSpreadChange, input.thresholds),
      input.spreadSnapshots.find((snapshot) => snapshot.spreadChange20d !== null)?.source ??
        unavailablePublicSource("Credit spread trend", input.asOf),
      medianSpreadChange === null ? "No public 20D spread history is available yet." : null
    ),
    scoreComponent(
      "Orderbook coverage",
      multipleLabel(coverage),
      scoreOrderbookCoverage(coverage, input.thresholds),
      input.debtIssues.find((issue) => issue.coverageRatio !== null)?.source ??
        unavailablePublicSource("Orderbook coverage", input.asOf),
      coverage === null
        ? "Public filings and configured public sources did not disclose orderbook size."
        : null
    ),
    scoreComponent(
      "New issue concession",
      bpLevelLabel(concession),
      scoreNewIssueConcession(concession, input.thresholds),
      input.debtIssues.find((issue) => issue.newIssueConcessionBp !== null)?.source ??
        unavailablePublicSource("New issue concession", input.asOf),
      concession === null
        ? "Public sources did not provide both new issue spread and comparable secondary spread."
        : null
    ),
    scoreComponent(
      "Capex / cash-flow pressure",
      latestFinancialMetric?.capexToOperatingCashFlow === null ||
        latestFinancialMetric?.capexToOperatingCashFlow === undefined
        ? "N/A"
        : `${latestFinancialMetric.capexToOperatingCashFlow.toFixed(2)}x capex / OCF`,
      scoreCapexPressure(latestFinancialMetric),
      latestFinancialMetric?.source ?? unavailablePublicSource("Capex pressure", input.asOf),
      latestFinancialMetric ? null : "No parsed SEC quarterly metrics are available yet."
    )
  ];
  const totalScore = components.reduce((sum, item) => sum + (item.score ?? 0), 0);
  const availableMaxScore = components.reduce((sum, item) => sum + (item.score === null ? 0 : 3), 0);

  return {
    asOf: input.asOf,
    availableMaxScore,
    components,
    fullMaxScore: 12,
    state: stressState(totalScore, availableMaxScore),
    totalScore
  };
}

function interpretation(score: AiFundingStressScore): string {
  if (score.state === "insufficient_data") {
    return "Public data is not complete enough to classify AI funding stress. Missing debt-demand metrics are shown as N/A rather than estimated. Funding stress is a fundamental regime warning, not a trade timing signal.";
  }
  if (score.state === "low") {
    return "Funding conditions remain broadly healthy across the public inputs currently available. Funding stress is not a standalone US100 timing signal.";
  }
  if (score.state === "moderate") {
    return "Public inputs show moderate AI funding stress. The signal should be interpreted as regime context, not as an automatic short trigger.";
  }
  if (score.state === "high") {
    return "Public inputs show high AI funding stress, raising valuation-compression risk if US100 price action also weakens. This remains separate from trade timing.";
  }
  return "Public inputs show severe AI funding stress. Treat this as a fundamental regime warning that still needs separate trade-timing confirmation.";
}

export function buildAiFundingDashboard(input: AiFundingDashboardInput): AiFundingDashboard {
  const thresholds = { ...defaultThresholds, ...input.thresholds };
  const spreadSnapshots = buildSpreadSnapshots(input);
  const score = buildScore({
    asOf: input.asOf,
    debtIssues: input.debtIssues,
    quarterlyMetrics: input.quarterlyMetrics,
    spreadSnapshots,
    thresholds
  });
  const currentMedianSpread = median(
    spreadSnapshots.map((snapshot) => snapshot.spreadBp).filter((value): value is number => value !== null)
  );
  const medianSpreadChange = median(
    spreadSnapshots
      .map((snapshot) => snapshot.spreadChange20d)
      .filter((value): value is number => value !== null)
  );
  const coverage = latestIssueMetric(input.debtIssues, "coverageRatio");
  const concession = latestIssueMetric(input.debtIssues, "newIssueConcessionBp");
  const financialMetric = latestQuarter(input.quarterlyMetrics);
  const spreadSource =
    spreadSnapshots.find((snapshot) => snapshot.spreadBp !== null)?.source ??
    unavailablePublicSource("Credit spread", input.asOf);
  const coverageSource =
    input.debtIssues.find((issue) => issue.coverageRatio !== null)?.source ??
    unavailablePublicSource("Orderbook coverage", input.asOf);
  const concessionSource =
    input.debtIssues.find((issue) => issue.newIssueConcessionBp !== null)?.source ??
    unavailablePublicSource("New issue concession", input.asOf);
  const capexSource = financialMetric?.source ?? unavailablePublicSource("Capex", input.asOf);

  return AiFundingDashboardSchema.parse({
    alerts: input.alerts ?? [],
    asOf: input.asOf,
    dataSources: [
      spreadSource,
      coverageSource,
      concessionSource,
      capexSource,
      ...input.treasuryYields.map((item) => item.source)
    ],
    events: [...input.events].sort((left, right) => left.date.localeCompare(right.date)),
    interpretation: interpretation(score),
    issuerCards: input.issuers.map((issuer) => {
      const issuerSpreads = spreadSnapshots.filter((snapshot) => snapshot.issuerId === issuer.id);
      const issuerSpread = median(
        issuerSpreads.map((snapshot) => snapshot.spreadBp).filter((value): value is number => value !== null)
      );
      const issuerSpreadChange = median(
        issuerSpreads
          .map((snapshot) => snapshot.spreadChange20d)
          .filter((value): value is number => value !== null)
      );
      const issuerIssues = input.debtIssues.filter((issue) => issue.issuerId === issuer.id);
      const issuerFinancials = latestQuarter(
        input.quarterlyMetrics.filter((metric) => metric.issuerId === issuer.id)
      );
      const nextEarnings =
        input.events
          .filter((event) => event.issuerId === issuer.id && event.type === "earnings")
          .sort((left, right) => left.date.localeCompare(right.date))[0]?.date ?? "N/A";
      return {
        capexGuidanceChange: pctLabel(issuerFinancials?.guidanceRevisionPct ?? null),
        creditSpread: bpLevelLabel(issuerSpread),
        fcfTrend: cashTrendLabel(issuerFinancials?.freeCashFlow ?? null),
        issuerId: issuer.id,
        latestConcession: bpLevelLabel(latestIssueMetric(issuerIssues, "newIssueConcessionBp")),
        latestIssueCoverage: multipleLabel(latestIssueMetric(issuerIssues, "coverageRatio")),
        name: issuer.name,
        nextEarningsDate: nextEarnings,
        ticker: issuer.ticker,
        twentyDaySpreadChange: bpLabel(issuerSpreadChange)
      };
    }),
    metrics: [
      {
        current: bpLevelLabel(currentMedianSpread),
        label: "Credit spread",
        oneMonthAgo:
          medianSpreadChange === null || currentMedianSpread === null
            ? "N/A"
            : bpLevelLabel(currentMedianSpread - medianSpreadChange),
        source: spreadSource,
        threeMonthsAgo: "N/A",
        trend:
          medianSpreadChange === null
            ? "na"
            : medianSpreadChange > 0
              ? "up"
              : medianSpreadChange < 0
                ? "down"
                : "flat"
      },
      {
        current: multipleLabel(coverage),
        label: "Orderbook coverage",
        oneMonthAgo: "N/A",
        source: coverageSource,
        threeMonthsAgo: "N/A",
        trend: "na"
      },
      {
        current: bpLevelLabel(concession),
        label: "New issue concession",
        oneMonthAgo: "N/A",
        source: concessionSource,
        threeMonthsAgo: "N/A",
        trend: "na"
      },
      {
        current: pctLabel(financialMetric?.yoyCapexGrowth ?? null),
        label: "Hyperscaler capex",
        oneMonthAgo: "N/A",
        source: capexSource,
        threeMonthsAgo: "N/A",
        trend:
          financialMetric?.yoyCapexGrowth === null || financialMetric?.yoyCapexGrowth === undefined
            ? "na"
            : financialMetric.yoyCapexGrowth > 0
              ? "up"
              : "down"
      },
      {
        current:
          financialMetric?.freeCashFlow === null || financialMetric?.freeCashFlow === undefined
            ? "N/A"
            : `$${Math.round(financialMetric.freeCashFlow / 1_000_000_000)}bn`,
        label: "Free cash flow",
        oneMonthAgo: "N/A",
        source: capexSource,
        threeMonthsAgo: "N/A",
        trend: cashTrendLabel(financialMetric?.freeCashFlow ?? null) === "N/A" ? "na" : "flat"
      }
    ],
    schemaVersion: "0.1.0",
    score
  });
}

function textBetween(value: string, start: string, end: string): string[] {
  return [...value.matchAll(new RegExp(`${start}([\\s\\S]*?)${end}`, "g"))].map(
    (match) => match[1] ?? ""
  );
}

function xmlValue(entry: string, tag: string): string | null {
  return entry.match(new RegExp(`<d:${tag}[^>]*>(.*?)<\\/d:${tag}>`))?.[1] ?? null;
}

function parseTreasuryNumber(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function createTreasuryXmlYieldProvider(config: {
  fetch?: FetchLike;
  now?: () => Date;
} = {}): TreasuryYieldProvider {
  const fetcher = config.fetch ?? fetch;
  return {
    async getTreasuryYields(input) {
      const year = input.date.slice(0, 4);
      const url = new URL("https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml");
      url.searchParams.set("data", "daily_treasury_yield_curve");
      url.searchParams.set("field_tdr_date_value", year);
      const response = await fetcher(url);
      if (!response.ok) {
        throw new Error(`Treasury yield feed returned ${response.status}.`);
      }
      const body = await response.text();
      const entries = textBetween(body, "<entry>", "</entry>");
      const entry =
        entries.find((item) => xmlValue(item, "NEW_DATE")?.startsWith(input.date)) ??
        entries.at(-1);
      if (!entry) {
        return [];
      }
      const observedDate = xmlValue(entry, "NEW_DATE")?.slice(0, 10) ?? input.date;
      const sourceValue = metricSource({
        completeness: "complete",
        confidence: "high",
        lastUpdated: (config.now?.() ?? new Date()).toISOString(),
        source: "U.S. Treasury Daily Treasury Par Yield Curve Rates",
        sourceTimestamp: `${observedDate}T12:00:00.000Z`,
        sourceType: "treasury",
        sourceUrl: String(url)
      });
      return ([
        ["5Y", "BC_5YEAR"],
        ["10Y", "BC_10YEAR"],
        ["30Y", "BC_30YEAR"]
      ] as const)
        .map(([tenor, tag]) => {
          const value = parseTreasuryNumber(xmlValue(entry, tag));
          return value === null
            ? null
            : {
                date: observedDate,
                source: sourceValue,
                tenor: tenor as AiFundingTenorBucket,
                yield: value
              };
        })
        .filter((item): item is AiFundingTreasuryYield => item !== null);
    }
  };
}

type SecFactUnit = {
  filed?: string;
  form?: string;
  fp?: string;
  frame?: string;
  fy?: number;
  val?: number;
};

type SecCompanyFacts = {
  facts?: {
    "us-gaap"?: Record<string, { units?: Record<string, SecFactUnit[]> }>;
  };
};

function latestUsdFact(facts: SecCompanyFacts, tags: string[]): SecFactUnit | null {
  for (const tag of tags) {
    const latest = (facts.facts?.["us-gaap"]?.[tag]?.units?.USD ?? [])
      .filter((item) => typeof item.val === "number" && (item.form === "10-Q" || item.form === "10-K"))
      .sort((left, right) => (right.filed ?? "").localeCompare(left.filed ?? ""))[0];
    if (latest) {
      return latest;
    }
  }
  return null;
}

export function createSecEdgarCompanyFinancialsProvider(config: {
  fetch?: FetchLike;
  now?: () => Date;
  userAgent: string;
}): CompanyFinancialsProvider {
  const fetcher = config.fetch ?? fetch;
  return {
    async getQuarterlyMetrics(input) {
      return Promise.all(
        input.issuers.map(async (issuer) => {
          const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${issuer.cik}.json`;
          const response = await fetcher(url, {
            headers: { "User-Agent": config.userAgent }
          });
          if (!response.ok) {
            throw new Error(`SEC companyfacts returned ${response.status} for ${issuer.ticker}.`);
          }
          const facts = (await response.json()) as SecCompanyFacts;
          const capex = latestUsdFact(facts, [
            "PaymentsToAcquirePropertyPlantAndEquipment",
            "PaymentsToAcquireProductiveAssets"
          ]);
          const ocf = latestUsdFact(facts, ["NetCashProvidedByUsedInOperatingActivities"]);
          const revenue = latestUsdFact(facts, [
            "RevenueFromContractWithCustomerExcludingAssessedTax",
            "Revenues"
          ]);
          const capexValue = capex?.val ?? null;
          const ocfValue = ocf?.val ?? null;
          const fcf = ocfValue !== null && capexValue !== null ? ocfValue - capexValue : null;
          return AiFundingQuarterlyMetricSchema.parse({
            aiCloudCommentary: null,
            capexGuidanceHigh: null,
            capexGuidanceLow: null,
            capexToFcf: capexValue !== null && fcf ? capexValue / fcf : null,
            capexToOperatingCashFlow: capexValue !== null && ocfValue ? capexValue / ocfValue : null,
            cloudRevenue: null,
            debtIssuance: null,
            freeCashFlow: fcf,
            guidanceMidpoint: null,
            guidanceRevisionPct: null,
            issuerId: issuer.id,
            leaseCommitments: null,
            operatingCashFlow: ocfValue,
            previousCapex: null,
            previousGuidanceMidpoint: null,
            purchaseCommitments: null,
            qoqCapexGrowth: null,
            quarter: capex?.frame ?? `${capex?.fy ?? "unknown"}${capex?.fp ?? ""}`,
            reportedCapex: capexValue,
            revenue: revenue?.val ?? null,
            source: metricSource({
              completeness: capexValue !== null && ocfValue !== null ? "partial" : "unavailable",
              confidence: "medium",
              lastUpdated: (config.now?.() ?? new Date()).toISOString(),
              source: `SEC EDGAR companyfacts for ${issuer.ticker}`,
              sourceTimestamp: capex?.filed ? `${capex.filed}T12:00:00.000Z` : null,
              sourceType: "sec_edgar",
              sourceUrl: url
            }),
            yoyCapexGrowth: null
          });
        })
      );
    }
  };
}

export function createFinraQueryCorporateBondProvider(config: {
  dataset: string;
  fetch?: FetchLike;
  group?: string;
}): CorporateBondMarketProvider {
  const fetcher = config.fetch ?? fetch;
  const group = config.group ?? "fixedIncomeMarket";
  return {
    async getBondObservations(input) {
      return Promise.all(
        input.bonds.map(async (bond) => {
          const url = `https://api.finra.org/data/group/${group}/name/${config.dataset}`;
          const response = await fetcher(url, {
            body: JSON.stringify({
              compareFilters: [
                {
                  compareType: "equal",
                  fieldName: bond.identifier.type === "cusip" ? "cusip" : "securityId",
                  fieldValue: bond.identifier.value
                }
              ],
              limit: 1,
              sortFields: ["tradeDate"],
              sortOrder: "desc"
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST"
          });
          if (!response.ok) {
            throw new Error(`FINRA query returned ${response.status} for ${bond.id}.`);
          }
          const latest = ((await response.json()) as Array<Record<string, unknown>>)[0];
          const rawYield = latest?.yield;
          const yieldValue =
            typeof rawYield === "number"
              ? rawYield
              : typeof rawYield === "string"
                ? Number(rawYield)
                : null;
          return {
            bondId: bond.id,
            corporateYield: yieldValue !== null && Number.isFinite(yieldValue) ? yieldValue : null,
            observedAt: new Date().toISOString(),
            price: null,
            source: metricSource({
              completeness: yieldValue === null ? "unavailable" : "partial",
              confidence: "medium",
              source: "FINRA public fixed income data",
              sourceTimestamp: null,
              sourceType: "finra_trace",
              sourceUrl: url
            }),
            tradeDate: input.date,
            volumeUsd: null
          };
        })
      );
    }
  };
}
