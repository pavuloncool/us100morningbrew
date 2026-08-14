import { NextRequest } from "next/server";

import { runMorningBrewAutomation } from "@/lib/automation";
import { isAppLocale, type AppLocale } from "@/lib/briefings";
import { createRerunEnv, parseRerunMode, rerunOptions } from "@/lib/review-rerun";
import {
  hasReviewAccess,
  reviewSessionCookieName,
  reviewTokenFromAuthorization
} from "@/lib/review-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

const defaultRerunLocales: AppLocale[] = ["pl"];

function redirectToReview(request: NextRequest, status: string, token: string | null): Response {
  const url = new URL("/review", request.url);
  url.searchParams.set("rerun", status);
  if (token) {
    url.searchParams.set("token", token);
  }
  return Response.redirect(url, 303);
}

function parseLocales(value: string | null): AppLocale[] | undefined {
  if (!value) {
    return undefined;
  }

  const locales = value
    .split(",")
    .map((locale) => locale.trim())
    .filter(isAppLocale);

  return locales.length > 0 ? locales : undefined;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const formData = contentType.includes("application/json")
    ? null
    : await request.formData();
  const jsonData = formData ? null : ((await request.json()) as Record<string, unknown>);

  const token =
    (formData?.get("token")?.toString() ?? undefined) ||
    (typeof jsonData?.token === "string" ? jsonData.token : undefined) ||
    reviewTokenFromAuthorization(request.headers.get("authorization"));
  const session = request.cookies.get(reviewSessionCookieName)?.value;

  if (!hasReviewAccess({ session, token })) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locales =
    parseLocales(formData?.get("locales")?.toString() ?? null) ??
    parseLocales(typeof jsonData?.locales === "string" ? jsonData.locales : null) ??
    defaultRerunLocales;
  const mode = parseRerunMode(
    formData?.get("mode")?.toString() ??
      (typeof jsonData?.mode === "string" ? jsonData.mode : null)
  );

  try {
    const modeOptions = rerunOptions(mode);
    const result = await runMorningBrewAutomation(
      {
        force: true,
        locales,
        ...modeOptions
      },
      createRerunEnv(mode)
    );

    if (formData) {
      return redirectToReview(request, result.status, token ?? null);
    }

    return Response.json(result, { status: result.status === "failed" ? 500 : 200 });
  } catch (error) {
    if (formData) {
      return redirectToReview(request, "failed", token ?? null);
    }

    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
