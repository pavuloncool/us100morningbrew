export const rerunModes = ["quick", "full"] as const;
export type RerunMode = (typeof rerunModes)[number];

export type RerunAutomationOptions = {
  idempotencyScope: string;
  runSource: string;
  slugSuffix: string;
};

export function parseRerunMode(value: string | null): RerunMode {
  return rerunModes.includes(value as RerunMode) ? (value as RerunMode) : "quick";
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
  env: Record<string, string | undefined> = process.env
): Record<string, string | undefined> {
  return mode === "full" ? fullRerunEnv(env) : quickRerunEnv(env);
}

export function rerunOptions(mode: RerunMode): RerunAutomationOptions {
  return mode === "full"
    ? {
        idempotencyScope: "manual-full",
        runSource: "review-full",
        slugSuffix: "full-research-test"
      }
    : {
        idempotencyScope: "manual-quick",
        runSource: "review-quick",
        slugSuffix: "quick-test"
      };
}
