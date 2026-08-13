import { NextRequest, NextResponse } from "next/server";

import { sendReviewLoginCode } from "@/lib/review-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = formData.get("email")?.toString() ?? "";

  try {
    await sendReviewLoginCode(email);
    const url = new URL("/review/verify", request.url);
    url.searchParams.set("email", email);
    return NextResponse.redirect(url, 303);
  } catch {
    return redirectTo(request, "/review/login?error=1");
  }
}
