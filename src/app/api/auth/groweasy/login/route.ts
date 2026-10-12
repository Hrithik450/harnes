import { NextRequest, NextResponse } from "next/server";
import { generatePkce, getOrCreateClientId } from "@/lib/auth/groweasy.oauth";

export async function GET(request: NextRequest) {
  try {
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      request.nextUrl.host;
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;

    const redirectUri = `${origin}/api/auth/groweasy/callback`;
    const clientId = await getOrCreateClientId(redirectUri);
    const { verifier, challenge, state } = generatePkce();

    const mcpBase =
      process.env.GROWEASY_MCP_URL?.replace(/\/+$/, "") || "https://groweasy.ai/api/mcp";

    const authUrl = new URL(`${mcpBase}/oauth/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authUrl.toString());

    // Store PKCE verifier and state in secure HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: proto === "https",
      sameSite: "lax" as const,
      maxAge: 60 * 15, // 15 minutes
      path: "/",
    };

    response.cookies.set("ge_verifier", verifier, cookieOptions);
    response.cookies.set("ge_state", state, cookieOptions);
    response.cookies.set("ge_client_id", clientId, cookieOptions);
    response.cookies.set("ge_redirect_uri", redirectUri, cookieOptions);

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unknown_error";
    console.error("[GrowEasy Login] Error generating auth URL:", error);
    return NextResponse.json(
      { error: "Failed to initiate GrowEasy authentication", details: message },
      { status: 500 }
    );
  }
}
