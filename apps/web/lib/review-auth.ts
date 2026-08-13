import { createHmac, timingSafeEqual } from "node:crypto";

type ReviewEnv = Record<string, string | undefined>;

export const reviewSessionCookieName = "us100_review_session";
export const reviewSessionMaxAgeSeconds = 60 * 60 * 24 * 14;

type ReviewSessionPayload = {
  email: string;
  exp: number;
};

type SupabaseVerifyResponse = {
  access_token?: string;
  user?: {
    email?: string;
  };
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function equalSignatures(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function reviewSessionSecret(env: ReviewEnv = process.env): string | undefined {
  return env.US100_REVIEW_SESSION_SECRET ?? getReviewSecret(env);
}

export function getReviewSecret(env: ReviewEnv = process.env): string | undefined {
  return env.US100_REVIEW_SECRET ?? env.REVIEW_SECRET;
}

export function allowedReviewEmails(env: ReviewEnv = process.env): string[] {
  const value = env.US100_REVIEW_EMAILS ?? env.US100_REVIEW_EMAIL ?? "";
  return value
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
}

export function isReviewEmailAllowed(email: string, env: ReviewEnv = process.env): boolean {
  const allowed = allowedReviewEmails(env);
  if (allowed.length === 0) {
    return env.NODE_ENV !== "production";
  }

  return allowed.includes(normalizeEmail(email));
}

export function hasReviewTokenAccess(
  token: string | null | undefined,
  env: ReviewEnv = process.env
): boolean {
  const secret = getReviewSecret(env);
  if (!secret) {
    return env.NODE_ENV !== "production";
  }

  return token === secret;
}

export function createReviewSession(email: string, env: ReviewEnv = process.env): string {
  const secret = reviewSessionSecret(env);
  if (!secret) {
    throw new Error("Review session secret is not configured.");
  }

  const payload: ReviewSessionPayload = {
    email: normalizeEmail(email),
    exp: Math.floor(Date.now() / 1000) + reviewSessionMaxAgeSeconds
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function verifyReviewSession(
  session: string | null | undefined,
  env: ReviewEnv = process.env
): { email: string } | null {
  const secret = reviewSessionSecret(env);
  if (!session || !secret) {
    return null;
  }

  const [encodedPayload, signature] = session.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, secret);
  if (!equalSignatures(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as ReviewSessionPayload;
    if (!payload.email || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    if (!isReviewEmailAllowed(payload.email, env)) {
      return null;
    }
    return { email: payload.email };
  } catch {
    return null;
  }
}

export function hasReviewAccess(
  input: { session?: string | null; token?: string | null | undefined },
  env: ReviewEnv = process.env
): boolean {
  return Boolean(verifyReviewSession(input.session, env)) || hasReviewTokenAccess(input.token, env);
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

function supabaseAuthConfig(env: ReviewEnv): { anonKey: string; url: string } {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Review login requires SUPABASE_URL and SUPABASE_ANON_KEY.");
  }

  return {
    anonKey,
    url: url.endsWith("/") ? url.slice(0, -1) : url
  };
}

async function parseSupabaseAuthResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase Auth request failed with ${response.status}: ${body}`);
  }

  return (await response.json()) as T;
}

export async function sendReviewLoginCode(
  email: string,
  env: ReviewEnv = process.env
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  if (!isReviewEmailAllowed(normalizedEmail, env)) {
    throw new Error("This email is not allowed to access review.");
  }

  const { anonKey, url } = supabaseAuthConfig(env);
  const response = await fetch(`${url}/auth/v1/otp`, {
    body: JSON.stringify({
      create_user: true,
      email: normalizedEmail
    }),
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  await parseSupabaseAuthResponse<Record<string, never>>(response);
}

export async function verifyReviewLoginCode(
  email: string,
  code: string,
  env: ReviewEnv = process.env
): Promise<{ email: string; session: string }> {
  const normalizedEmail = normalizeEmail(email);
  if (!isReviewEmailAllowed(normalizedEmail, env)) {
    throw new Error("This email is not allowed to access review.");
  }

  const { anonKey, url } = supabaseAuthConfig(env);
  const response = await fetch(`${url}/auth/v1/verify`, {
    body: JSON.stringify({
      email: normalizedEmail,
      token: code.trim(),
      type: "email"
    }),
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const data = await parseSupabaseAuthResponse<SupabaseVerifyResponse>(response);
  const verifiedEmail = normalizeEmail(data.user?.email ?? normalizedEmail);

  return {
    email: verifiedEmail,
    session: createReviewSession(verifiedEmail, env)
  };
}
