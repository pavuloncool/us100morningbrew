import { z } from "zod";

export const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const IsoTimestampSchema = z.string().datetime({ offset: true });
export const UrlSchema = z.string().url();
export const LocaleSchema = z.enum(["pl", "en"]);

export const EvidenceSchema = z
  .object({
    label: z.string().trim().min(1),
    value: z.string().trim().min(1),
    sourceIds: z.array(z.string().trim().min(1)).default([])
  })
  .strict();

export const SignalImpactSchema = z.enum([
  "short_thesis_strengthened",
  "short_thesis_weakened",
  "mixed",
  "unchanged"
]);

export const ConvictionSchema = z.enum(["low", "medium", "high"]);

export const VerdictSchema = z
  .object({
    stance: SignalImpactSchema,
    conviction: ConvictionSchema,
    summary: z.string().trim().min(1),
    whyItMatters: z.string().trim().min(1)
  })
  .strict();

export const KeySignalSchema = z
  .object({
    title: z.string().trim().min(1),
    observation: z.string().trim().min(1),
    whyItMatters: z.string().trim().min(1),
    impact: SignalImpactSchema,
    evidence: z.array(EvidenceSchema).min(1)
  })
  .strict();

export const BriefingSectionSchema = z
  .object({
    title: z.string().trim().min(1),
    observation: z.string().trim().min(1),
    whyItMatters: z.string().trim().min(1),
    impact: SignalImpactSchema,
    evidence: z.array(EvidenceSchema).default([])
  })
  .strict();

export const ScorecardItemSchema = z
  .object({
    factor: z.string().trim().min(1),
    signal: SignalImpactSchema,
    observation: z.string().trim().min(1),
    whyItMatters: z.string().trim().min(1)
  })
  .strict();

export const WatchItemSchema = z
  .object({
    label: z.string().trim().min(1),
    trigger: z.string().trim().min(1),
    whyItMatters: z.string().trim().min(1)
  })
  .strict();

export const SourceSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    publisher: z.string().trim().min(1).nullable(),
    url: UrlSchema,
    observedAt: IsoTimestampSchema.nullable()
  })
  .strict();

export const MorningBrewStatusSchema = z.enum(["draft", "published", "archived"]);

export const MorningBrewSchema = z
  .object({
    schemaVersion: z.literal("0.1.0"),
    language: LocaleSchema,
    date: IsoDateSchema,
    slug: z.string().trim().min(1),
    status: MorningBrewStatusSchema,
    publishedAt: IsoTimestampSchema.nullable(),
    headline: z.string().trim().min(1),
    deck: z.string().trim().min(1),
    verdict: VerdictSchema,
    keySignal: KeySignalSchema,
    sections: z
      .object({
        priceAction: BriefingSectionSchema,
        breadth: BriefingSectionSchema,
        aiSemis: BriefingSectionSchema,
        ratesFed: BriefingSectionSchema,
        volatility: BriefingSectionSchema
      })
      .strict(),
    thesisScorecard: z.array(ScorecardItemSchema).min(1),
    whatChanged: z.array(WatchItemSchema).min(1),
    levelsToWatch: z.array(WatchItemSchema).min(1),
    sources: z.array(SourceSchema).min(1)
  })
  .strict();

export type Evidence = z.infer<typeof EvidenceSchema>;
export type Locale = z.infer<typeof LocaleSchema>;
export type SignalImpact = z.infer<typeof SignalImpactSchema>;
export type Conviction = z.infer<typeof ConvictionSchema>;
export type Verdict = z.infer<typeof VerdictSchema>;
export type KeySignal = z.infer<typeof KeySignalSchema>;
export type BriefingSection = z.infer<typeof BriefingSectionSchema>;
export type ScorecardItem = z.infer<typeof ScorecardItemSchema>;
export type WatchItem = z.infer<typeof WatchItemSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type MorningBrew = z.infer<typeof MorningBrewSchema>;
