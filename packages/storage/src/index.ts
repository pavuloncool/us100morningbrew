import { LocaleSchema, MorningBrewSchema, type Locale, type MorningBrew } from "@us100/contracts";

export type BriefingRepository = {
  listBriefings(locale: Locale, options?: { limit?: number }): Promise<MorningBrew[]>;
  getLatestBriefing(locale: Locale): Promise<MorningBrew | null>;
  getBriefingBySlug(slug: string, locale: Locale): Promise<MorningBrew | null>;
  saveBriefing(briefing: MorningBrew): Promise<MorningBrew>;
};

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

type SupabaseRestConfig = {
  apiKey: string;
  fetch?: FetchLike;
  url: string;
};

type SupabaseBriefingRow = {
  payload: unknown;
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

export type ResearchRunClaim = {
  acquired: boolean;
  run: StoredResearchRun;
};

export type ResearchRunRepository = {
  claimResearchRun(input: ClaimResearchRunInput): Promise<ResearchRunClaim>;
  completeResearchRun(id: string, input: CompleteResearchRunInput): Promise<StoredResearchRun>;
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

type StorageEnv = Record<string, string | undefined>;

const defaultPublishedStatus = "published" satisfies MorningBrew["status"];

function normalizeSupabaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function toPublishedBriefing(row: SupabaseBriefingRow): MorningBrew {
  return MorningBrewSchema.parse(row.payload);
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

export function createSupabaseRestBriefingRepository(
  config: SupabaseRestConfig
): BriefingRepository {
  const fetcher = config.fetch ?? fetch;
  const headers = supabaseHeaders(config.apiKey);

  return {
    async listBriefings(locale, options = {}) {
      const parsedLocale = LocaleSchema.parse(locale);
      const url = briefingUrl(config.url, {
        language: `eq.${parsedLocale}`,
        limit: options.limit ?? 50,
        order: "published_at.desc.nullslast,date.desc",
        select: "payload",
        status: `eq.${defaultPublishedStatus}`
      });
      const rows = await parseSupabaseResponse<SupabaseBriefingRow[]>(
        await fetcher(url, { headers })
      );
      return rows.map(toPublishedBriefing);
    },

    async getLatestBriefing(locale) {
      const [briefing] = await this.listBriefings(locale, { limit: 1 });
      return briefing ?? null;
    },

    async getBriefingBySlug(slug, locale) {
      const parsedLocale = LocaleSchema.parse(locale);
      const url = briefingUrl(config.url, {
        language: `eq.${parsedLocale}`,
        limit: 1,
        select: "payload",
        slug: `eq.${slug}`,
        status: `eq.${defaultPublishedStatus}`
      });
      const rows = await parseSupabaseResponse<SupabaseBriefingRow[]>(
        await fetcher(url, { headers })
      );
      return rows[0] ? toPublishedBriefing(rows[0]) : null;
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
    }
  };
}

export function createSupabaseRestResearchRunRepository(
  config: SupabaseRestConfig
): ResearchRunRepository {
  const fetcher = config.fetch ?? fetch;
  const headers = supabaseHeaders(config.apiKey);

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
        select:
          "id,idempotency_key,run_date,language,status,started_at,completed_at,error_message,metrics,created_at"
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
        select:
          "id,idempotency_key,run_date,language,status,started_at,completed_at,error_message,metrics,created_at"
      });
      const existingRows = await parseSupabaseResponse<SupabaseResearchRunRow[]>(
        await fetcher(existingUrl, { headers })
      );
      if (!existingRows[0]) {
        throw new Error(`Could not claim or find research run ${input.idempotencyKey}.`);
      }
      return {
        acquired: false,
        run: toStoredResearchRun(existingRows[0])
      };
    },

    async completeResearchRun(id, input) {
      const url = researchRunUrl(config.url, {
        id: `eq.${id}`,
        select:
          "id,idempotency_key,run_date,language,status,started_at,completed_at,error_message,metrics,created_at"
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
