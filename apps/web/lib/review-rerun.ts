export const rerunModes = ["quick", "full"] as const;
export type RerunMode = (typeof rerunModes)[number];
export const rerunReportTypes = ["daily", "weekly"] as const;
export type RerunReportType = (typeof rerunReportTypes)[number];

export type RerunAutomationOptions = {
  idempotencyScope: string;
  minEvidenceSources?: number;
  reportType?: RerunReportType;
  runSource: string;
  slugSuffix?: string;
};

export function parseRerunMode(value: string | null): RerunMode {
  return rerunModes.includes(value as RerunMode) ? (value as RerunMode) : "quick";
}

export function parseRerunReportType(value: string | null): RerunReportType {
  return rerunReportTypes.includes(value as RerunReportType)
    ? (value as RerunReportType)
    : "daily";
}

function quickRerunEnv(env: Record<string, string | undefined>): Record<string, string | undefined> {
  return {
    ...env,
    OPENAI_MAX_OUTPUT_TOKENS: env.US100_RERUN_OPENAI_MAX_OUTPUT_TOKENS ?? "6000",
    OPENAI_REASONING_EFFORT: env.US100_RERUN_OPENAI_REASONING_EFFORT ?? "minimal",
    OPENAI_REQUEST_TIMEOUT_MS: env.US100_RERUN_OPENAI_TIMEOUT_MS ?? "45000",
    OPENAI_TEXT_VERBOSITY: env.US100_RERUN_OPENAI_TEXT_VERBOSITY ?? "low",
    US100_BUDGET_MAX_REQUESTS: env.US100_RERUN_MAX_REQUESTS ?? "15",
    US100_BUDGET_NEWS_RSS_ENABLED: env.US100_RERUN_NEWS_RSS_ENABLED ?? "false",
    US100_BUDGET_REQUEST_TIMEOUT_MS: env.US100_RERUN_REQUEST_TIMEOUT_MS ?? "4000"
  };
}

function fullRerunEnv(env: Record<string, string | undefined>): Record<string, string | undefined> {
  return {
    ...env,
    OPENAI_MAX_OUTPUT_TOKENS:
      env.US100_FULL_RERUN_OPENAI_MAX_OUTPUT_TOKENS ??
      env.OPENAI_MAX_OUTPUT_TOKENS ??
      "6500",
    OPENAI_REASONING_EFFORT:
      env.US100_FULL_RERUN_OPENAI_REASONING_EFFORT ??
      env.OPENAI_REASONING_EFFORT ??
      "minimal",
    OPENAI_REQUEST_TIMEOUT_MS:
      env.US100_FULL_RERUN_OPENAI_TIMEOUT_MS ?? env.OPENAI_REQUEST_TIMEOUT_MS ?? "50000",
    OPENAI_TEXT_VERBOSITY:
      env.US100_FULL_RERUN_OPENAI_TEXT_VERBOSITY ?? env.OPENAI_TEXT_VERBOSITY ?? "low",
    US100_BUDGET_MAX_REQUESTS:
      env.US100_FULL_RERUN_MAX_REQUESTS ?? env.US100_BUDGET_MAX_REQUESTS ?? "30",
    US100_BUDGET_NEWS_RSS_ENABLED:
      env.US100_FULL_RERUN_NEWS_RSS_ENABLED ?? env.US100_BUDGET_NEWS_RSS_ENABLED ?? "true",
    US100_BUDGET_REQUEST_TIMEOUT_MS:
      env.US100_FULL_RERUN_REQUEST_TIMEOUT_MS ?? env.US100_BUDGET_REQUEST_TIMEOUT_MS ?? "8000"
  };
}

export function createRerunEnv(
  mode: RerunMode,
  reportType: RerunReportType = "daily",
  env: Record<string, string | undefined> = process.env
): Record<string, string | undefined> {
  const rerunEnv = mode === "full" ? fullRerunEnv(env) : quickRerunEnv(env);
  if (reportType !== "weekly") {
    return rerunEnv;
  }
  return {
    ...rerunEnv,
    US100_WEEKLY_SUMMARY_ENABLED: "true"
  };
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function rerunOptions(
  mode: RerunMode,
  reportType: RerunReportType = "daily",
  env: Record<string, string | undefined> = process.env
): RerunAutomationOptions {
  if (reportType === "weekly") {
    return {
      idempotencyScope: mode === "full" ? "manual-weekly-full" : "manual-weekly-quick",
      minEvidenceSources:
        mode === "full" ? positiveInteger(env.US100_WEEKLY_SUMMARY_MIN_SOURCES, 8) : undefined,
      reportType: "weekly",
      runSource: mode === "full" ? "review-weekly-full" : "review-weekly-quick"
    };
  }

  return mode === "full"
    ? {
        idempotencyScope: "manual-full",
        minEvidenceSources: positiveInteger(env.US100_FULL_RERUN_MIN_SOURCES, 8),
        runSource: "review-full",
        slugSuffix: "full-research-test"
      }
    : {
        idempotencyScope: "manual-quick",
        runSource: "review-quick",
        slugSuffix: "quick-test"
      };
}
