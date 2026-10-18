import { NextRequest, NextResponse } from "next/server";
import { getGoogleOAuthLoginUrl } from "@/lib/auth/google";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/";

  try {
    const url = getGoogleOAuthLoginUrl(origin, returnTo);
    return NextResponse.redirect(url);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to initiate Google sign-in";
    console.error("[Google OAuth Login Error]", err);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(message)}`, req.url),
    );
  }
}
