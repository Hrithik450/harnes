import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleIdToken } from "@/lib/auth/google";
import { UserService } from "@/lib/services/user/user.service";
import { attachSessionCookie, getSessionFromRequest } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ success: false, user: null }, { status: 401 });
    }
    return NextResponse.json({ success: true, user: session });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch session" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    let credential: string | undefined;

    // Support both application/x-www-form-urlencoded and JSON
    const params = new URLSearchParams(raw);
    credential = params.get("credential") ?? undefined;

    if (!credential) {
      try {
        const json = JSON.parse(raw) as Record<string, unknown>;
        if (typeof json.credential === "string") credential = json.credential;
      } catch {
        // Not JSON
      }
    }

    if (!credential) {
      return NextResponse.json(
        { success: false, error: "Missing Google ID token credential." },
        { status: 400 },
      );
    }

    // Verify token using google-auth-library
    const identity = await verifyGoogleIdToken(credential);

    if (!identity.emailVerified) {
      return NextResponse.json(
        { success: false, error: "Google email is not verified." },
        { status: 400 },
      );
    }

    // Find or create user in PostgreSQL
    const { user, created } = await UserService.findOrCreateGoogleUser({
      google_id: identity.googleId,
      email: identity.email,
      name: identity.name,
      picture: identity.picture,
    });

    const response = NextResponse.json({
      success: true,
      user,
      created,
    });

    // Attach JWT session cookie
    return await attachSessionCookie(response, user);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Internal server error during Google login";
    console.error("[Google Auth Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}
