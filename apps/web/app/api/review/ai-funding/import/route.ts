import { NextRequest } from "next/server";
import { AiFundingDashboardSchema } from "@us100/contracts";

import { getAiFundingRepository } from "@/lib/ai-funding";
import {
  hasReviewAccess,
  reviewSessionCookieName,
  reviewTokenFromAuthorization
} from "@/lib/review-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const token = reviewTokenFromAuthorization(request.headers.get("authorization"));
  const session = request.cookies.get(reviewSessionCookieName)?.value;

  if (!hasReviewAccess({ session, token })) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const dashboard = AiFundingDashboardSchema.parse(payload);
    const saved = await getAiFundingRepository().saveDashboard(dashboard);
    return Response.json({
      asOf: saved.asOf,
      score: saved.score.totalScore,
      state: saved.score.state,
      status: "saved"
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 400 }
    );
  }
}
