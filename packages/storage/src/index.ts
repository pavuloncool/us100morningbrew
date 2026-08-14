import { LocaleSchema, MorningBrewSchema, type Locale, type MorningBrew } from "@us100/contracts";

export type BriefingStatus = MorningBrew["status"];
export type BriefingListOptions = {
  limit?: number;
  status?: BriefingStatus | "any";
};

export type StoredBriefingRecord = {
  briefing: MorningBrew;
  id: string;
  language: Locale;
  publishedAt: string | null;
  slug: string;
  status: BriefingStatus;
};

export type RenderArtifactFormat = "web" | "newsletter" | "instagram_carousel";

export type StoredRenderArtifact = {
  artifactPath: string | null;
  artifactUrl: string | null;
  briefingId: string;
  createdAt: string;
  format: RenderArtifactFormat;
  id: string;
  language: Locale;
  metadata: Record<string, unknown>;
};

export type SaveRenderArtifactInput = {
  artifactPath?: string | null;
  artifactUrl?: string | null;
  briefingId: string;
  format: RenderArtifactFormat;
  language: Locale;
  metadata?: Record<string, unknown>;
};

export type BriefingRepository = {
  listBriefingRecords(locale: Locale, options?: BriefingListOptions): Promise<StoredBriefingRecord[]>;
  listBriefings(locale: Locale, options?: BriefingListOptions): Promise<MorningBrew[]>;
  getLatestBriefing(locale: Locale): Promise<MorningBrew | null>;
  getBriefingRecordBySlug(
    slug: string,
    locale: Locale,
    options?: { status?: BriefingStatus | "any" }
  ): Promise<StoredBriefingRecord | null>;
  getBriefingBySlug(
    slug: string,
    locale: Locale,
    options?: { status?: BriefingStatus | "any" }
  ): Promise<MorningBrew | null>;
  publishBriefing(slug: string, locale: Locale, publishedAt?: string): Promise<MorningBrew>;
  saveBriefing(briefing: MorningBrew): Promise<MorningBrew>;
  saveRenderArtifact(input: SaveRenderArtifactInput): Promise<StoredRenderArtifact>;
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

type SupabaseRestConfig = {
  apiKey: string;
  fetch?: FetchLike;
  url: string;
};

type SupabaseBriefingRow = {
  id: string;
  language: Locale;
  payload: unknown;
  published_at: string | null;
  slug: string;
  status: BriefingStatus;
};

export type ResearchRunStatus = "queued" | "running" | "failed" | "drafted" | "published";

export type StoredResearchRun = {
  completedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  id: string;
  idempotencyKey: string;
  language: Locale;
  metrics: Record<string, unknown>;
  runDate: string;
  startedAt: string;
  status: ResearchRunStatus;
};

export type ClaimResearchRunInput = {
  idempotencyKey: string;
  locale: Locale;
  metrics?: Record<string, unknown>;
  runDate: string;
};

export type CompleteResearchRunInput = {
  errorMessage?: string | null;
  metrics?: Record<string, unknown>;
  status: Extract<ResearchRunStatus, "failed" | "drafted" | "published">;
};

export type ResearchRunListOptions = {
  limit?: number;
};

export type ResearchRunClaim = {
  acquired: boolean;
  run: StoredResearchRun;
};

export type ResearchRunRepository = {
  claimResearchRun(input: ClaimResearchRunInput): Promise<ResearchRunClaim>;
  completeResearchRun(id: string, input: CompleteResearchRunInput): Promise<StoredResearchRun>;
  listResearchRuns(options?: ResearchRunListOptions): Promise<StoredResearchRun[]>;
};

type SupabaseWritableBriefingRow = {
  date: string;
  language: Locale;
  payload: MorningBrew;
  published_at: string | null;
  schema_version: MorningBrew["schemaVersion"];
  slug: string;
  status: MorningBrew["status"];
};

type SupabaseResearchRunRow = {
  completed_at: string | null;
  created_at: string;
  error_message: string | null;
  id: string;
  idempotency_key: string;
  language: Locale;
  metrics: Record<string, unknown>;
  run_date: string;
  started_at: string;
  status: ResearchRunStatus;
};

type SupabaseRenderArtifactRow = {
  artifact_path: string | null;
  artifact_url: string | null;
  briefing_id: string;
  created_at: string;
  format: RenderArtifactFormat;
  id: string;
  language: Locale;
  metadata: Record<string, unknown>;
};

type StorageEnv = Record<string, string | undefined>;

const defaultPublishedStatus = "published" satisfies MorningBrew["status"];
const staleRunningRunMs = 5 * 60 * 1000;

function normalizeSupabaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function toPublishedBriefing(row: SupabaseBriefingRow): MorningBrew {
  return MorningBrewSchema.parse(row.payload);
}

function canonicalDailySlug(date: string): string {
  return `${date}-us100-morning-brew`;
}

function archivedSlug(slug: string, rowId: string): string {
  const suffix = rowId.slice(0, 8);
  return slug.endsWith(`-archived-${suffix}`) ? slug : `${slug}-archived-${suffix}`;
}

function toArchivedBriefing(row: SupabaseBriefingRow, slug = row.slug): MorningBrew {
  const briefing = MorningBrewSchema.parse(row.payload);
  return MorningBrewSchema.parse({
    ...briefing,
    publishedAt: briefing.publishedAt ?? row.published_at,
    slug,
    status: "archived"
  });
}

function toStoredBriefingRecord(row: SupabaseBriefingRow): StoredBriefingRecord {
  return {
    briefing: MorningBrewSchema.parse(row.payload),
    id: row.id,
    language: LocaleSchema.parse(row.language),
    publishedAt: row.published_at,
    slug: row.slug,
    status: row.status
  };
}

function toWritableRow(briefing: MorningBrew): SupabaseWritableBriefingRow {
  return {
    date: briefing.date,
    language: briefing.language,
    payload: briefing,
    published_at: briefing.publishedAt,
    schema_version: briefing.schemaVersion,
    slug: briefing.slug,
    status: briefing.status
  };
}

function supabaseHeaders(apiKey: string): HeadersInit {
  return {
    Accept: "application/json",
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
}

async function parseSupabaseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase request failed with ${response.status}: ${body}`);
  }

  return (await response.json()) as T;
}

function briefingUrl(baseUrl: string, params: Record<string, string | number>): URL {
  const url = new URL(`${normalizeSupabaseUrl(baseUrl)}/rest/v1/briefings`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  return url;
}

function researchRunUrl(baseUrl: string, params: Record<string, string | number>): URL {
  const url = new URL(`${normalizeSupabaseUrl(baseUrl)}/rest/v1/research_runs`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  return url;
}

function renderArtifactUrl(baseUrl: string, params: Record<string, string | number>): URL {
  const url = new URL(`${normalizeSupabaseUrl(baseUrl)}/rest/v1/render_artifacts`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  return url;
}

function toStoredResearchRun(row: SupabaseResearchRunRow): StoredResearchRun {
  return {
    completedAt: row.completed_at,
    createdAt: row.created_at,
    errorMessage: row.error_message,
    id: row.id,
    idempotencyKey: row.idempotency_key,
    language: LocaleSchema.parse(row.language),
    metrics: row.metrics,
    runDate: row.run_date,
    startedAt: row.started_at,
    status: row.status
  };
}

function toStoredRenderArtifact(row: SupabaseRenderArtifactRow): StoredRenderArtifact {
  return {
    artifactPath: row.artifact_path,
    artifactUrl: row.artifact_url,
    briefingId: row.briefing_id,
    createdAt: row.created_at,
    format: row.format,
    id: row.id,
    language: LocaleSchema.parse(row.language),
    metadata: row.metadata
  };
}

function canRetryResearchRun(row: SupabaseResearchRunRow): boolean {
  if (row.status === "failed") {
    return true;
  }
  if (row.status !== "running") {
    return false;
  }
  return Date.now() - new Date(row.started_at).getTime() > staleRunningRunMs;
}

function briefingSelect(): string {
  return "id,language,payload,published_at,slug,status";
}

function applyStatusFilter(
  params: Record<string, string | number>,
  status: BriefingStatus | "any" | undefined
): Record<string, string | number> {
  if (!status || status === "published") {
    return { ...params, status: `eq.${defaultPublishedStatus}` };
  }

  if (status === "any") {
    return params;
  }

  return { ...params, status: `eq.${status}` };
}

export function createSupabaseRestBriefingRepository(
  config: SupabaseRestConfig
): BriefingRepository {
  const fetcher = config.fetch ?? fetch;
  const headers = supabaseHeaders(config.apiKey);

  return {
    async listBriefingRecords(locale, options = {}) {
      const parsedLocale = LocaleSchema.parse(locale);
      const url = briefingUrl(
        config.url,
        applyStatusFilter(
          {
            language: `eq.${parsedLocale}`,
            limit: options.limit ?? 50,
            order: "date.desc,created_at.desc",
            select: briefingSelect()
          },
          options.status
        )
      );
      const rows = await parseSupabaseResponse<SupabaseBriefingRow[]>(
        await fetcher(url, { headers })
      );
      return rows.map(toStoredBriefingRecord);
    },

    async listBriefings(locale, options = {}) {
      const rows = await this.listBriefingRecords(locale, options);
      return rows.map((row) => row.briefing);
    },

    async getLatestBriefing(locale) {
      const [briefing] = await this.listBriefings(locale, { limit: 1 });
      return briefing ?? null;
    },

    async getBriefingRecordBySlug(slug, locale, options = {}) {
      const parsedLocale = LocaleSchema.parse(locale);
      const url = briefingUrl(
        config.url,
        applyStatusFilter(
          {
            language: `eq.${parsedLocale}`,
            limit: 1,
            select: briefingSelect(),
            slug: `eq.${slug}`
          },
          options.status
        )
      );
      const rows = await parseSupabaseResponse<SupabaseBriefingRow[]>(
        await fetcher(url, { headers })
      );
      return rows[0] ? toStoredBriefingRecord(rows[0]) : null;
    },

    async getBriefingBySlug(slug, locale, options = {}) {
      const row = await this.getBriefingRecordBySlug(slug, locale, options);
      return row?.briefing ?? null;
    },

    async publishBriefing(slug, locale, publishedAt = new Date().toISOString()) {
      const existing = await this.getBriefingRecordBySlug(slug, locale, { status: "any" });
      if (!existing) {
        throw new Error(`Briefing ${slug}/${locale} was not found.`);
      }

      const parsedLocale = LocaleSchema.parse(locale);
      const publicSlug = canonicalDailySlug(existing.briefing.date);
      const canonicalConflictUrl = briefingUrl(config.url, {
        id: `neq.${existing.id}`,
        language: `eq.${parsedLocale}`,
        select: briefingSelect(),
        slug: `eq.${publicSlug}`
      });
      const canonicalConflictRows = await parseSupabaseResponse<SupabaseBriefingRow[]>(
        await fetcher(canonicalConflictUrl, { headers })
      );
      await Promise.all(
        canonicalConflictRows.map(async (row) => {
          const archivedBriefing = toArchivedBriefing(row, archivedSlug(row.slug, row.id));
          const archiveUrl = briefingUrl(config.url, {
            id: `eq.${row.id}`,
            select: "payload"
          });
          await parseSupabaseResponse<SupabaseBriefingRow[]>(
            await fetcher(archiveUrl, {
              body: JSON.stringify(toWritableRow(archivedBriefing)),
              headers: {
                ...headers,
                Prefer: "return=representation"
              },
              method: "PATCH"
            })
          );
        })
      );

      const publishedBriefing = MorningBrewSchema.parse({
        ...existing.briefing,
        publishedAt,
        slug: publicSlug,
        status: "published"
      });
      const url = briefingUrl(config.url, {
        id: `eq.${existing.id}`,
        select: briefingSelect()
      });
      const rows = await parseSupabaseResponse<SupabaseBriefingRow[]>(
        await fetcher(url, {
          body: JSON.stringify(toWritableRow(publishedBriefing)),
          headers: {
            ...headers,
            Prefer: "return=representation"
          },
          method: "PATCH"
        })
      );
      if (!rows[0]) {
        throw new Error(`Briefing ${slug}/${locale} was not published.`);
      }
      const published = toPublishedBriefing(rows[0]);

      const olderPublishedUrl = briefingUrl(config.url, {
        date: `eq.${published.date}`,
        id: `neq.${existing.id}`,
        language: `eq.${parsedLocale}`,
        select: briefingSelect(),
        slug: `neq.${published.slug}`,
        status: "eq.published"
      });
      const olderPublishedRows = await parseSupabaseResponse<SupabaseBriefingRow[]>(
        await fetcher(olderPublishedUrl, { headers })
      );
      await Promise.all(
        olderPublishedRows.map(async (row) => {
          const archivedBriefing = toArchivedBriefing(row);
          const archiveUrl = briefingUrl(config.url, {
            id: `eq.${row.id}`,
            select: "payload"
          });
          await parseSupabaseResponse<SupabaseBriefingRow[]>(
            await fetcher(archiveUrl, {
              body: JSON.stringify(toWritableRow(archivedBriefing)),
              headers: {
                ...headers,
                Prefer: "return=representation"
              },
              method: "PATCH"
            })
          );
        })
      );

      return published;
    },

    async saveBriefing(briefing) {
      const parsedBriefing = MorningBrewSchema.parse(briefing);
      const url = briefingUrl(config.url, {
        on_conflict: "slug,language",
        select: "payload"
      });
      const rows = await parseSupabaseResponse<SupabaseBriefingRow[]>(
        await fetcher(url, {
          body: JSON.stringify(toWritableRow(parsedBriefing)),
          headers: {
            ...headers,
            Prefer: "resolution=merge-duplicates,return=representation"
          },
          method: "POST"
        })
      );
      if (!rows[0]) {
        throw new Error("Supabase did not return the saved briefing row.");
      }
      return toPublishedBriefing(rows[0]);
    },

    async saveRenderArtifact(input) {
      const parsedLocale = LocaleSchema.parse(input.language);
      const url = renderArtifactUrl(config.url, {
        select: "id,briefing_id,format,language,artifact_url,artifact_path,metadata,created_at"
      });
      const rows = await parseSupabaseResponse<SupabaseRenderArtifactRow[]>(
        await fetcher(url, {
          body: JSON.stringify({
            artifact_path: input.artifactPath ?? null,
            artifact_url: input.artifactUrl ?? null,
            briefing_id: input.briefingId,
            format: input.format,
            language: parsedLocale,
            metadata: input.metadata ?? {}
          }),
          headers: {
            ...headers,
            Prefer: "return=representation"
          },
          method: "POST"
        })
      );
      if (!rows[0]) {
        throw new Error("Supabase did not return the saved render artifact row.");
      }
      return toStoredRenderArtifact(rows[0]);
    }
  };
}

export function createSupabaseRestResearchRunRepository(
  config: SupabaseRestConfig
): ResearchRunRepository {
  const fetcher = config.fetch ?? fetch;
  const headers = supabaseHeaders(config.apiKey);
  const select =
    "id,idempotency_key,run_date,language,status,started_at,completed_at,error_message,metrics,created_at";

  return {
    async claimResearchRun(input) {
      const row = {
        idempotency_key: input.idempotencyKey,
        language: LocaleSchema.parse(input.locale),
        metrics: input.metrics ?? {},
        run_date: input.runDate,
        status: "running" satisfies ResearchRunStatus
      };
      const insertUrl = researchRunUrl(config.url, {
        on_conflict: "idempotency_key",
        select
      });
      const insertedRows = await parseSupabaseResponse<SupabaseResearchRunRow[]>(
        await fetcher(insertUrl, {
          body: JSON.stringify(row),
          headers: {
            ...headers,
            Prefer: "resolution=ignore-duplicates,return=representation"
          },
          method: "POST"
        })
      );
      if (insertedRows[0]) {
        return {
          acquired: true,
          run: toStoredResearchRun(insertedRows[0])
        };
      }

      const existingUrl = researchRunUrl(config.url, {
        idempotency_key: `eq.${input.idempotencyKey}`,
        limit: 1,
        select
      });
      const existingRows = await parseSupabaseResponse<SupabaseResearchRunRow[]>(
        await fetcher(existingUrl, { headers })
      );
      if (!existingRows[0]) {
        throw new Error(`Could not claim or find research run ${input.idempotencyKey}.`);
      }
      if (canRetryResearchRun(existingRows[0])) {
        const retryUrl = researchRunUrl(config.url, {
          id: `eq.${existingRows[0].id}`,
          select
        });
        const retryRows = await parseSupabaseResponse<SupabaseResearchRunRow[]>(
          await fetcher(retryUrl, {
            body: JSON.stringify({
              completed_at: null,
              error_message: null,
              metrics: input.metrics ?? {},
              started_at: new Date().toISOString(),
              status: "running"
            }),
            headers: {
              ...headers,
              Prefer: "return=representation"
            },
            method: "PATCH"
          })
        );
        if (!retryRows[0]) {
          throw new Error(`Could not retry research run ${input.idempotencyKey}.`);
        }
        return {
          acquired: true,
          run: toStoredResearchRun(retryRows[0])
        };
      }
      return {
        acquired: false,
        run: toStoredResearchRun(existingRows[0])
      };
    },

    async completeResearchRun(id, input) {
      const url = researchRunUrl(config.url, {
        id: `eq.${id}`,
        select
      });
      const rows = await parseSupabaseResponse<SupabaseResearchRunRow[]>(
        await fetcher(url, {
          body: JSON.stringify({
            completed_at: new Date().toISOString(),
            error_message: input.errorMessage ?? null,
            metrics: input.metrics ?? {},
            status: input.status
          }),
          headers: {
            ...headers,
            Prefer: "return=representation"
          },
          method: "PATCH"
        })
      );
      if (!rows[0]) {
        throw new Error(`Research run ${id} was not found.`);
      }
      return toStoredResearchRun(rows[0]);
    },

    async listResearchRuns(options = {}) {
      const url = researchRunUrl(config.url, {
        limit: options.limit ?? 20,
        order: "run_date.desc,created_at.desc",
        select
      });
      const rows = await parseSupabaseResponse<SupabaseResearchRunRow[]>(
        await fetcher(url, { headers })
      );
      return rows.map(toStoredResearchRun);
    }
  };
}

export function createNoopResearchRunRepository(): ResearchRunRepository {
  return {
    async claimResearchRun(input) {
      const now = new Date().toISOString();
      return {
        acquired: true,
        run: {
          completedAt: null,
          createdAt: now,
          errorMessage: null,
          id: input.idempotencyKey,
          idempotencyKey: input.idempotencyKey,
          language: input.locale,
          metrics: input.metrics ?? {},
          runDate: input.runDate,
          startedAt: now,
          status: "running"
        }
      };
    },
    async completeResearchRun(id, input) {
      const now = new Date().toISOString();
      return {
        completedAt: now,
        createdAt: now,
        errorMessage: input.errorMessage ?? null,
        id,
        idempotencyKey: id,
        language: "pl",
        metrics: input.metrics ?? {},
        runDate: now.slice(0, 10),
        startedAt: now,
        status: input.status
      };
    },
    async listResearchRuns() {
      return [];
    }
  };
}

export function createBriefingRepositoryFromEnv(
  fallback: BriefingRepository,
  env: StorageEnv = process.env
): BriefingRepository {
  const storageProvider = env.US100_STORAGE_PROVIDER ?? "auto";
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey =
    env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (storageProvider === "fixture") {
    return fallback;
  }

  if (url && apiKey) {
    return createSupabaseRestBriefingRepository({ apiKey, url });
  }

  if (storageProvider === "supabase") {
    throw new Error("US100_STORAGE_PROVIDER=supabase requires SUPABASE_URL and a Supabase API key.");
  }

  return fallback;
}

export function createResearchRunRepositoryFromEnv(
  fallback: ResearchRunRepository,
  env: StorageEnv = process.env
): ResearchRunRepository {
  const storageProvider = env.US100_STORAGE_PROVIDER ?? "auto";
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey =
    env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (storageProvider === "fixture") {
    return fallback;
  }

  if (url && apiKey) {
    return createSupabaseRestResearchRunRepository({ apiKey, url });
  }

  if (storageProvider === "supabase") {
    throw new Error("US100_STORAGE_PROVIDER=supabase requires SUPABASE_URL and a Supabase API key.");
  }

  return fallback;
}
