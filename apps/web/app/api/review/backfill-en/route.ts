import { NextRequest } from "next/server";

import { publishEnglishTranslationFromLatestPolish } from "@/lib/briefing-translation";
import {
  hasReviewAccess,
  reviewSessionCookieName,
  reviewTokenFromAuthorization
} from "@/lib/review-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

function redirectToReview(request: NextRequest, status: string, token: string | null): Response {
  const url = new URL("/review", request.url);
  url.searchParams.set("translate", status);
  if (token) {
    url.searchParams.set("token", token);
  }
  return Response.redirect(url, 303);
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

  const date =
    formData?.get("date")?.toString() ??
    (typeof jsonData?.date === "string" ? jsonData.date : undefined);

  try {
    const briefing = await publishEnglishTranslationFromLatestPolish({ date });

    if (formData) {
      return redirectToReview(request, "completed", token ?? null);
    }

    return Response.json({
      briefing: {
        date: briefing.date,
        language: briefing.language,
        slug: briefing.slug,
        status: briefing.status
      }
    });
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
