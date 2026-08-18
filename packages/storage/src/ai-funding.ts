import {
  AiFundingDashboardSchema,
  type AiFundingDashboard,
  type AiFundingStressState
} from "@us100/contracts";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
type StorageEnv = Record<string, string | undefined>;

export type AiFundingRepository = {
  getLatestDashboard(): Promise<AiFundingDashboard | null>;
  saveDashboard(dashboard: AiFundingDashboard): Promise<AiFundingDashboard>;
};

type SupabaseRestConfig = {
  apiKey: string;
  fetch?: FetchLike;
  url: string;
};

type SupabaseAiFundingStressScoreRow = {
  as_of: string;
  available_max_score: number;
  completeness: string;
  confidence: string;
  dashboard_payload: unknown;
  full_max_score: 12;
  id: string;
  last_updated: string;
  score: number;
  source: string;
  source_timestamp: string | null;
  source_type: string;
  source_url: string | null;
  stress_state: AiFundingStressState;
};

function normalizeSupabaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
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

function aiFundingStressScoreUrl(baseUrl: string, params: Record<string, string | number>): URL {
  const url = new URL(`${normalizeSupabaseUrl(baseUrl)}/rest/v1/ai_funding_stress_scores`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, String(value));
  });
  return url;
}

function scoreSelect(): string {
  return [
    "id",
    "as_of",
    "score",
    "available_max_score",
    "full_max_score",
    "stress_state",
    "dashboard_payload",
    "source",
    "source_url",
    "source_type",
    "source_timestamp",
    "last_updated",
    "confidence",
    "completeness"
  ].join(",");
}

function toStoredDashboard(row: SupabaseAiFundingStressScoreRow): AiFundingDashboard {
  return AiFundingDashboardSchema.parse(row.dashboard_payload);
}

function toWritableRow(dashboard: AiFundingDashboard) {
  const primarySource = dashboard.dataSources[0] ?? {
    completeness: "partial" as const,
    confidence: "medium" as const,
    lastUpdated: dashboard.asOf,
    source: "AI Funding Stress Monitor",
    sourceTimestamp: dashboard.asOf,
    sourceType: "derived" as const,
    sourceUrl: null
  };
  return {
    as_of: dashboard.asOf,
    available_max_score: dashboard.score.availableMaxScore,
    completeness: primarySource.completeness,
    confidence: primarySource.confidence,
    dashboard_payload: dashboard,
    full_max_score: dashboard.score.fullMaxScore,
    last_updated: primarySource.lastUpdated,
    score: dashboard.score.totalScore,
    source: primarySource.source,
    source_timestamp: primarySource.sourceTimestamp,
    source_type: primarySource.sourceType,
    source_url: primarySource.sourceUrl,
    stress_state: dashboard.score.state
  };
}

export function createSupabaseRestAiFundingRepository(
  config: SupabaseRestConfig
): AiFundingRepository {
  const fetcher = config.fetch ?? fetch;
  const headers = supabaseHeaders(config.apiKey);

  return {
    async getLatestDashboard() {
      const url = aiFundingStressScoreUrl(config.url, {
        limit: 1,
        order: "as_of.desc",
        select: scoreSelect()
      });
      const rows = await parseSupabaseResponse<SupabaseAiFundingStressScoreRow[]>(
        await fetcher(url, { headers })
      );
      return rows[0] ? toStoredDashboard(rows[0]) : null;
    },

    async saveDashboard(dashboard) {
      const parsedDashboard = AiFundingDashboardSchema.parse(dashboard);
      const url = aiFundingStressScoreUrl(config.url, {
        on_conflict: "as_of",
        select: scoreSelect()
      });
      const rows = await parseSupabaseResponse<SupabaseAiFundingStressScoreRow[]>(
        await fetcher(url, {
          body: JSON.stringify(toWritableRow(parsedDashboard)),
          headers: {
            ...headers,
            Prefer: "resolution=merge-duplicates,return=representation"
          },
          method: "POST"
        })
      );
      if (!rows[0]) {
        throw new Error("Supabase did not return the saved AI funding dashboard row.");
      }
      return toStoredDashboard(rows[0]);
    }
  };
}

export function createAiFundingRepositoryFromEnv(
  fallback: AiFundingRepository,
  env: StorageEnv = process.env
): AiFundingRepository {
  const storageProvider = env.US100_STORAGE_PROVIDER ?? "auto";
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey =
    env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (storageProvider === "fixture") {
    return fallback;
  }

  if (url && apiKey) {
    return createSupabaseRestAiFundingRepository({ apiKey, url });
  }

  if (storageProvider === "supabase") {
    throw new Error("US100_STORAGE_PROVIDER=supabase requires SUPABASE_URL and a Supabase API key.");
  }

  return fallback;
}
