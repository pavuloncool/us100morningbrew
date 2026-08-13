import { NextRequest, NextResponse } from "next/server";

import {
  reviewSessionCookieName,
  reviewSessionMaxAgeSeconds,
  verifyReviewLoginCode
} from "@/lib/review-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email")?.toString() ?? "";
  const code = formData.get("code")?.toString() ?? "";

  try {
    const result = await verifyReviewLoginCode(email, code);
    const response = redirectTo(request, "/review");
    response.cookies.set(reviewSessionCookieName, result.session, {
      httpOnly: true,
      maxAge: reviewSessionMaxAgeSeconds,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    return response;
  } catch {
    const url = new URL("/review/verify", request.url);
    if (email) {
      url.searchParams.set("email", email);
    }
    url.searchParams.set("error", "1");
    return NextResponse.redirect(url, 303);
  }
}
