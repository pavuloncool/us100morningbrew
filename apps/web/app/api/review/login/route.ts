import { NextRequest, NextResponse } from "next/server";

import { sendReviewLoginCode } from "@/lib/review-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

function errorCode(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("not allowed")) {
    return "email";
  }
  if (message.includes("SUPABASE_URL") || message.includes("SUPABASE_ANON_KEY")) {
    return "config";
  }
  if (message.includes("429")) {
    return "rate_limit";
  }
  if (message.includes("Supabase Auth")) {
    return "supabase";
  }
  return "unknown";
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email")?.toString() ?? "";

  try {
    await sendReviewLoginCode(email);
    const url = new URL("/review/verify", request.url);
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, 303);
  } catch (error) {
    console.error("[review-login] Could not send login code", error);
    const url = new URL("/review/login", request.url);
    url.searchParams.set("error", errorCode(error));
    if (email) {
      url.searchParams.set("email", email);
    }
    return NextResponse.redirect(url, 303);
  }
}
