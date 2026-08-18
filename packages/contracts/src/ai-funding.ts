import { z } from "zod";

import { IsoDateSchema, IsoTimestampSchema, UrlSchema } from "./morning-brew";

export const AiFundingSchemaVersionSchema = z.literal("0.1.0");
export const AiFundingIssuerIdSchema = z.enum(["msft", "amzn", "googl", "meta", "orcl"]);
export const AiFundingTenorBucketSchema = z.enum(["5Y", "10Y", "30Y"]);
export const AiFundingConfidenceSchema = z.enum(["low", "medium", "high"]);
export const AiFundingCompletenessSchema = z.enum(["complete", "partial", "unavailable"]);
export const AiFundingSourceTypeSchema = z.enum([
  "derived",
  "finra_trace",
  "fred",
  "openfigi",
  "public_web",
  "sec_edgar",
  "treasury"
]);

export const AiFundingMetricSourceSchema = z
  .object({
    completeness: AiFundingCompletenessSchema,
    confidence: AiFundingConfidenceSchema,
    lastUpdated: IsoTimestampSchema,
    source: z.string().trim().min(1),
    sourceTimestamp: IsoTimestampSchema.nullable(),
    sourceType: AiFundingSourceTypeSchema,
    sourceUrl: UrlSchema.nullable()
  })
  .strict();

export const AiFundingIssuerSchema = z
  .object({
    cik: z.string().trim().regex(/^\d{10}$/),
    enabled: z.boolean().default(true),
    id: AiFundingIssuerIdSchema,
    name: z.string().trim().min(1),
    ticker: z.string().trim().min(1)
  })
  .strict();

export const AiFundingBondIdentifierSchema = z
  .object({
    type: z.enum(["cusip", "figi", "isin", "trace_symbol", "other"]),
    value: z.string().trim().min(1)
  })
  .strict();

export const AiFundingBondSchema = z
  .object({
    active: z.boolean().default(true),
    coupon: z.number().nonnegative().nullable(),
    currency: z.literal("USD"),
    id: z.string().trim().min(1),
    identifier: AiFundingBondIdentifierSchema,
    issuerId: AiFundingIssuerIdSchema,
    maturityDate: IsoDateSchema,
    tenorBucket: AiFundingTenorBucketSchema
  })
  .strict();

export const AiFundingBondObservationSchema = z
  .object({
    bondId: z.string().trim().min(1),
    corporateYield: z.number().nonnegative().nullable(),
    observedAt: IsoTimestampSchema,
    price: z.number().positive().nullable(),
    source: AiFundingMetricSourceSchema,
    tradeDate: IsoDateSchema,
    volumeUsd: z.number().nonnegative().nullable()
  })
  .strict();

export const AiFundingTreasuryYieldSchema = z
  .object({
    date: IsoDateSchema,
    source: AiFundingMetricSourceSchema,
    tenor: AiFundingTenorBucketSchema,
    yield: z.number().nonnegative()
  })
  .strict();

export const AiFundingSpreadSnapshotSchema = z
  .object({
    benchmarkTreasuryYield: z.number().nonnegative().nullable(),
    bondId: z.string().trim().min(1),
    corporateYield: z.number().nonnegative().nullable(),
    issuerId: AiFundingIssuerIdSchema,
    source: AiFundingMetricSourceSchema,
    spreadBp: z.number().nullable(),
    spreadChange1d: z.number().nullable(),
    spreadChange5d: z.number().nullable(),
    spreadChange20d: z.number().nullable(),
    timestamp: IsoTimestampSchema
  })
  .strict();

export const AiFundingDebtIssueSchema = z
  .object({
    announcementDate: IsoDateSchema.nullable(),
    comparableSecondarySpreadBp: z.number().nullable(),
    coupon: z.number().nonnegative().nullable(),
    coverageRatio: z.number().positive().nullable(),
    finalSpreadBp: z.number().nullable(),
    id: z.string().trim().min(1),
    initialPriceTalk: z.string().trim().min(1).nullable(),
    issueSizeUsd: z.number().positive().nullable(),
    issuerId: AiFundingIssuerIdSchema,
    maturityDate: IsoDateSchema.nullable(),
    newIssueConcessionBp: z.number().nullable(),
    pricingDate: IsoDateSchema.nullable(),
    source: AiFundingMetricSourceSchema
  })
  .strict();

export const AiFundingQuarterlyMetricSchema = z
  .object({
    aiCloudCommentary: z.string().trim().min(1).nullable(),
    capexGuidanceHigh: z.number().nullable(),
    capexGuidanceLow: z.number().nullable(),
    capexToFcf: z.number().nullable(),
    capexToOperatingCashFlow: z.number().nullable(),
    cloudRevenue: z.number().nullable(),
    debtIssuance: z.number().nullable(),
    freeCashFlow: z.number().nullable(),
    guidanceMidpoint: z.number().nullable(),
    guidanceRevisionPct: z.number().nullable(),
    issuerId: AiFundingIssuerIdSchema,
    leaseCommitments: z.number().nullable(),
    operatingCashFlow: z.number().nullable(),
    previousCapex: z.number().nullable(),
    previousGuidanceMidpoint: z.number().nullable(),
    purchaseCommitments: z.number().nullable(),
    qoqCapexGrowth: z.number().nullable(),
    quarter: z.string().trim().min(1),
    reportedCapex: z.number().nullable(),
    revenue: z.number().nullable(),
    source: AiFundingMetricSourceSchema,
    yoyCapexGrowth: z.number().nullable()
  })
  .strict();

export const AiFundingEventSchema = z
  .object({
    date: IsoDateSchema,
    expectedTime: z.string().trim().min(1).nullable(),
    id: z.string().trim().min(1),
    issuerId: AiFundingIssuerIdSchema,
    source: AiFundingMetricSourceSchema,
    title: z.string().trim().min(1),
    type: z.enum([
      "bond_maturity",
      "bond_offering",
      "bond_pricing",
      "earnings",
      "guidance_update",
      "investor_day"
    ]),
    watchFields: z.array(z.string().trim().min(1)).default([])
  })
  .strict();

export const AiFundingStressComponentSchema = z
  .object({
    label: z.string().trim().min(1),
    metric: z.string().trim().min(1),
    score: z.number().int().min(0).max(3).nullable(),
    source: AiFundingMetricSourceSchema,
    unavailableReason: z.string().trim().min(1).nullable()
  })
  .strict();

export const AiFundingStressStateSchema = z.enum([
  "insufficient_data",
  "low",
  "moderate",
  "high",
  "severe"
]);

export const AiFundingStressScoreSchema = z
  .object({
    asOf: IsoTimestampSchema,
    availableMaxScore: z.number().int().min(0).max(12),
    components: z.array(AiFundingStressComponentSchema),
    fullMaxScore: z.literal(12),
    state: AiFundingStressStateSchema,
    totalScore: z.number().int().min(0).max(12)
  })
  .strict();

export const AiFundingAlertSchema = z
  .object({
    id: z.string().trim().min(1),
    message: z.string().trim().min(1),
    severity: z.enum(["info", "warning", "high", "severe"]),
    source: AiFundingMetricSourceSchema,
    triggeredAt: IsoTimestampSchema
  })
  .strict();

export const AiFundingDashboardMetricSchema = z
  .object({
    current: z.string().trim().min(1),
    label: z.string().trim().min(1),
    oneMonthAgo: z.string().trim().min(1),
    source: AiFundingMetricSourceSchema,
    threeMonthsAgo: z.string().trim().min(1),
    trend: z.enum(["down", "flat", "na", "up"])
  })
  .strict();

export const AiFundingIssuerCardSchema = z
  .object({
    capexGuidanceChange: z.string().trim().min(1),
    creditSpread: z.string().trim().min(1),
    fcfTrend: z.string().trim().min(1),
    issuerId: AiFundingIssuerIdSchema,
    latestConcession: z.string().trim().min(1),
    latestIssueCoverage: z.string().trim().min(1),
    name: z.string().trim().min(1),
    nextEarningsDate: z.string().trim().min(1),
    ticker: z.string().trim().min(1),
    twentyDaySpreadChange: z.string().trim().min(1)
  })
  .strict();

export const AiFundingDashboardSchema = z
  .object({
    alerts: z.array(AiFundingAlertSchema),
    asOf: IsoTimestampSchema,
    dataSources: z.array(AiFundingMetricSourceSchema),
    events: z.array(AiFundingEventSchema),
    interpretation: z.string().trim().min(1),
    issuerCards: z.array(AiFundingIssuerCardSchema),
    metrics: z.array(AiFundingDashboardMetricSchema),
    schemaVersion: AiFundingSchemaVersionSchema,
    score: AiFundingStressScoreSchema
  })
  .strict();

export type AiFundingAlert = z.infer<typeof AiFundingAlertSchema>;
export type AiFundingBond = z.infer<typeof AiFundingBondSchema>;
export type AiFundingBondObservation = z.infer<typeof AiFundingBondObservationSchema>;
export type AiFundingDashboard = z.infer<typeof AiFundingDashboardSchema>;
export type AiFundingDebtIssue = z.infer<typeof AiFundingDebtIssueSchema>;
export type AiFundingEvent = z.infer<typeof AiFundingEventSchema>;
export type AiFundingIssuer = z.infer<typeof AiFundingIssuerSchema>;
export type AiFundingIssuerId = z.infer<typeof AiFundingIssuerIdSchema>;
export type AiFundingMetricSource = z.infer<typeof AiFundingMetricSourceSchema>;
export type AiFundingQuarterlyMetric = z.infer<typeof AiFundingQuarterlyMetricSchema>;
export type AiFundingSpreadSnapshot = z.infer<typeof AiFundingSpreadSnapshotSchema>;
export type AiFundingStressComponent = z.infer<typeof AiFundingStressComponentSchema>;
export type AiFundingStressScore = z.infer<typeof AiFundingStressScoreSchema>;
export type AiFundingStressState = z.infer<typeof AiFundingStressStateSchema>;
export type AiFundingTenorBucket = z.infer<typeof AiFundingTenorBucketSchema>;
export type AiFundingTreasuryYield = z.infer<typeof AiFundingTreasuryYieldSchema>;
