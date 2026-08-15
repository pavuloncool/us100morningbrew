import type { NextRequest } from "next/server";

import { runMorningBrewAutomation } from "@/lib/automation";
import { isAppLocale, type AppLocale } from "@/lib/briefings";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${cronSecret}`;
}

function parseRequestedLocales(value: string | null): AppLocale[] | undefined {
  if (!value) {
    return undefined;
  }

  const locales = value
    .split(",")
    .map((locale) => locale.trim())
    .filter(isAppLocale);

  return locales.length > 0 ? locales : undefined;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = request.nextUrl.searchParams.get("force") === "1";
  const date = force ? request.nextUrl.searchParams.get("date") ?? undefined : undefined;
  const locales = force
    ? parseRequestedLocales(request.nextUrl.searchParams.get("locales"))
    : undefined;

  try {
    const result = await runMorningBrewAutomation({
      date,
      force,
      locales,
      reportType: "weekly"
    });
    return Response.json(result, { status: result.status === "failed" ? 500 : 200 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
