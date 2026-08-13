import { NextRequest, NextResponse } from "next/server";

import { reviewSessionCookieName } from "@/lib/review-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/review/login", request.url), 303);
  response.cookies.set(reviewSessionCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  });
  return response;
}
