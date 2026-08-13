import { NextRequest } from "next/server";

import {
  getBriefingRecordBySlug,
  isAppLocale,
  publishBriefing,
  saveRenderArtifact
} from "@/lib/briefings";
import { createNewsletterDraft } from "@/lib/newsletter";
import { hasReviewAccess, reviewTokenFromAuthorization } from "@/lib/review-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

function redirectToReview(
  request: NextRequest,
  locale: string,
  slug: string,
  token: string | null,
  newsletter: string
): Response {
  const url = new URL(`/review/${locale}/briefings/${slug}`, request.url);
  if (token) {
    url.searchParams.set("token", token);
  }
  url.searchParams.set("published", "1");
  url.searchParams.set("newsletter", newsletter);
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

  if (!hasReviewAccess(token)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locale =
    formData?.get("locale")?.toString() ??
    (typeof jsonData?.locale === "string" ? jsonData.locale : "");
  const slug =
    formData?.get("slug")?.toString() ??
    (typeof jsonData?.slug === "string" ? jsonData.slug : "");

  if (!isAppLocale(locale) || !slug) {
    return Response.json({ error: "Invalid locale or slug." }, { status: 400 });
  }

  const publishedBriefing = await publishBriefing(slug, locale);
  const record = await getBriefingRecordBySlug(slug, locale, "any");
  let newsletter = "skipped";

  try {
    const draftResult = await createNewsletterDraft(publishedBriefing);
    newsletter = draftResult.status;

    if (record) {
      await saveRenderArtifact({
        artifactPath: null,
        artifactUrl: draftResult.status === "created" ? draftResult.url : null,
        briefingId: record.id,
        format: "newsletter",
        language: locale,
        metadata: draftResult
      });
    }
  } catch (error) {
    newsletter = "failed";
    if (record) {
      await saveRenderArtifact({
        artifactPath: null,
        artifactUrl: null,
        briefingId: record.id,
        format: "newsletter",
        language: locale,
        metadata: {
          message: error instanceof Error ? error.message : String(error),
          provider: "kit",
          status: "failed"
        }
      });
    }
  }

  if (formData) {
    return redirectToReview(request, locale, slug, token ?? null, newsletter);
  }

  return Response.json({
    briefing: {
      language: publishedBriefing.language,
      slug: publishedBriefing.slug,
      status: publishedBriefing.status
    },
    newsletter
  });
}
