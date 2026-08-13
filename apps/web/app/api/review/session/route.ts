import { NextRequest, NextResponse } from "next/server";

import {
  createReviewSessionFromSupabaseAccessToken,
  reviewSessionCookieName,
  reviewSessionMaxAgeSeconds
} from "@/lib/review-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { accessToken?: string };
  const accessToken = body.accessToken;

  if (!accessToken) {
    return Response.json({ error: "Missing access token." }, { status: 400 });
  }

  try {
    const result = await createReviewSessionFromSupabaseAccessToken(accessToken);
    const response = NextResponse.json({ email: result.email, status: "ok" });
    response.cookies.set(reviewSessionCookieName, result.session, {
      httpOnly: true,
      maxAge: reviewSessionMaxAgeSeconds,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    return response;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 401 }
    );
  }
}
