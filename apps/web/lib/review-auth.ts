type ReviewEnv = Record<string, string | undefined>;

export function getReviewSecret(env: ReviewEnv = process.env): string | undefined {
  return env.US100_REVIEW_SECRET ?? env.REVIEW_SECRET;
}

export function hasReviewAccess(token: string | null | undefined, env: ReviewEnv = process.env): boolean {
  const secret = getReviewSecret(env);
  if (!secret) {
    return env.NODE_ENV !== "production";
  }

  return token === secret;
}

export function reviewTokenFromAuthorization(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const [scheme, token] = value.split(" ");
  return scheme === "Bearer" && token ? token : null;
}

export function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
