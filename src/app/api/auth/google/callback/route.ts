import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCodeForUser } from "@/lib/auth/google";
import { UserService, ThreadService } from "@/lib/services";
import { ThreadRepository } from "@/lib/repositories/thread.repository";
import { attachSessionCookie } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state") || "/";

    if (error) {
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(error)}`, req.url),
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/?auth_error=Missing+authorization+code", req.url),
      );
    }

    const origin = req.nextUrl.origin;
    const identity = await exchangeGoogleCodeForUser(code, origin);

    // Find or create user in database
    const { user } = await UserService.findOrCreateGoogleUser({
      google_id: identity.googleId,
      email: identity.email,
      name: identity.name,
      picture: identity.picture,
    });

    // Create default agent threads for this user in DB via ThreadService
    await ThreadService.createDefaultThreadsForUser(user.id);

    // Automatically claim all existing custom threads for this user
    await ThreadRepository.claimOrphanThreads(user.id);

    // Safely redirect to target path or root
    const redirectUrl = state.startsWith("/") ? state : "/";
    const response = NextResponse.redirect(new URL(redirectUrl, req.url));

    return await attachSessionCookie(response, user);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to authenticate with Google";
    console.error("[Google OAuth Callback Error]", err);
    return NextResponse.redirect(
      new URL(`/?auth_error=${encodeURIComponent(message)}`, req.url),
    );
  }
}
