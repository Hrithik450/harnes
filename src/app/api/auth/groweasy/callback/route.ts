import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/auth/groweasy.oauth";
import { OAuthConnectionService } from "@/lib/services/oauth.connection.service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const rawReturnTo = request.cookies.get("ge_return_to")?.value || "/";
  const returnTo =
    rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//")
      ? rawReturnTo
      : "/";

  if (error) {
    console.error("[GrowEasy Callback] Provider returned error:", error, errorDesc);
    const errorUrl = new URL(returnTo, origin);
    errorUrl.searchParams.set("groweasy_error", errorDesc || error);
    const res = NextResponse.redirect(errorUrl);
    res.cookies.delete("ge_return_to");
    return res;
  }

  const storedState = request.cookies.get("ge_state")?.value;
  const verifier = request.cookies.get("ge_verifier")?.value;
  const clientId =
    request.cookies.get("ge_client_id")?.value ||
    "58f264d6-eab7-492c-a58c-90af68453330";
  const redirectUri =
    request.cookies.get("ge_redirect_uri")?.value ||
    `${origin}/api/auth/groweasy/callback`;

  if (!code || !state || !verifier || state !== storedState) {
    console.error("[GrowEasy Callback] Invalid state or missing parameters");
    const errorUrl = new URL(returnTo, origin);
    errorUrl.searchParams.set("groweasy_error", "invalid_state_or_missing_code");
    const res = NextResponse.redirect(errorUrl);
    res.cookies.delete("ge_return_to");
    return res;
  }

  try {
    const tokenResult = await exchangeCodeForToken({
      code,
      codeVerifier: verifier,
      redirectUri,
      clientId,
    });

    const redirectUrl = new URL(returnTo, origin);
    redirectUrl.searchParams.set("connector_success", "groweasy");
    const response = NextResponse.redirect(redirectUrl);

    // Auto-detect organization ID via GrowEasy MCP get_user_orgs
    let detectedOrgId = "";
    try {
      const mcpEndpoint =
        process.env.GROWEASY_MCP_URL?.replace(/\/+$/, "") || "https://groweasy.ai/api/mcp";
      const orgRes = await fetch(mcpEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          Authorization: `Bearer ${tokenResult.access_token}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "get_user_orgs", arguments: {} },
        }),
      });
      const orgRaw = await orgRes.text();
      let orgJsonText = orgRaw;
      if (orgRaw.includes("data:")) {
        const line = orgRaw.split("\n").find((l) => l.startsWith("data:"));
        if (line) orgJsonText = line.replace(/^data:\s*/, "");
      }
      const parsed = JSON.parse(orgJsonText);
      const text = parsed?.result?.content?.[0]?.text;
      if (text) {
        const orgs = JSON.parse(text);
        if (Array.isArray(orgs) && orgs.length > 0 && orgs[0].org_id) {
          detectedOrgId = orgs[0].org_id;
        }
      }
    } catch (err) {
      console.warn("[GrowEasy Callback] Could not auto-detect org_id:", err);
    }

    // Persist to database for backend services & serverless environments
    await OAuthConnectionService.saveGrowEasyConnection({
      accessToken: tokenResult.access_token,
      refreshToken: tokenResult.refresh_token,
      orgId: detectedOrgId,
      expiresIn: tokenResult.expires_in,
    });

    // Store persistent access token
    const cookieAge = tokenResult.expires_in || 60 * 60 * 24 * 30; // 30 days default
    response.cookies.set("ge_access_token", tokenResult.access_token, {
      httpOnly: true,
      secure: proto === "https",
      sameSite: "lax",
      maxAge: cookieAge,
      path: "/",
    });

    if (tokenResult.refresh_token) {
      response.cookies.set("ge_refresh_token", tokenResult.refresh_token, {
        httpOnly: true,
        secure: proto === "https",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 90, // 90 days
        path: "/",
      });
    }

    // Clean up temporary cookies
    response.cookies.delete("ge_verifier");
    response.cookies.delete("ge_state");
    response.cookies.delete("ge_client_id");
    response.cookies.delete("ge_redirect_uri");
    response.cookies.delete("ge_return_to");

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "exchange_failed";
    console.error("[GrowEasy Callback] Token exchange failed:", err);
    const errorUrl = new URL(returnTo, origin);
    errorUrl.searchParams.set("groweasy_error", message);
    const res = NextResponse.redirect(errorUrl);
    res.cookies.delete("ge_return_to");
    return res;
  }
}
