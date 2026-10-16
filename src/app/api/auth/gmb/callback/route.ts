import { NextRequest, NextResponse } from "next/server";
import { exchangeGmbCode } from "@/lib/auth/gmb.oauth";
import { GmbService, GmbLocationItem } from "@/lib/services/gmb.service";
import { OAuthConnectionService } from "@/lib/services/oauth.connection.service";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const rawReturnTo = request.cookies.get("gmb_return_to")?.value || "/";
  const returnTo =
    rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//")
      ? rawReturnTo
      : "/";

  if (error) {
    const errorUrl = new URL(returnTo, origin);
    errorUrl.searchParams.set("connector_error", error);
    const res = NextResponse.redirect(errorUrl);
    res.cookies.delete("gmb_state");
    res.cookies.delete("gmb_return_to");
    return res;
  }

  const storedState = request.cookies.get("gmb_state")?.value;
  if (!code || !state || state !== storedState) {
    const errorUrl = new URL(returnTo, origin);
    errorUrl.searchParams.set("connector_error", "invalid_oauth_state");
    const res = NextResponse.redirect(errorUrl);
    res.cookies.delete("gmb_state");
    res.cookies.delete("gmb_return_to");
    return res;
  }

  try {
    const redirectUri = `${origin}/api/auth/gmb/callback`;
    const tokens = await exchangeGmbCode(code, redirectUri);

    // Fetch accessible locations (or graceful fallback if Google API quota is pending approval)
    let locations: GmbLocationItem[] = [];
    let isQuotaPending = false;
    try {
      locations = await GmbService.fetchAccessibleLocations(tokens.access_token);
    } catch (locErr) {
      console.warn("[GMB Callback] Could not fetch live locations (Google API quota 0):", locErr);
      isQuotaPending = true;
    }

    if (locations.length === 0) {
      locations = [
        {
          accountId: "accounts/default",
          locationId: "locations/default",
          locationName: "Google Business Profile",
          address: isQuotaPending
            ? "API Quota Pending (Google Basic Access required)"
            : "Default Business Location",
        },
      ];
    }

    // Default to the first location, store all accessible locations in metadata
    const activeLoc = locations[0];
    const saveResult = await OAuthConnectionService.saveConnection({
      provider: "google_gmb",
      orgId: "default",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
      metadata: {
        accountId: activeLoc.accountId,
        locationId: activeLoc.locationId,
        locationName: activeLoc.locationName,
        address: activeLoc.address,
        availableLocations: locations,
      },
    });

    if (!saveResult.success) {
      throw new Error(saveResult.error || "Failed to save Google connection");
    }

    const redirectUrl = new URL(returnTo, origin);
    redirectUrl.searchParams.set("connector_success", "google_gmb");
    if (locations.length > 1) {
      redirectUrl.searchParams.set("gmb_select_location", "1");
    }

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("gmb_state");
    response.cookies.delete("gmb_return_to");
    return response;
  } catch (err) {
    console.error("[GMB Callback] Error exchanging code:", err);
    const errorUrl = new URL(returnTo, origin);
    errorUrl.searchParams.set(
      "connector_error",
      err instanceof Error ? err.message : "gmb_auth_failed"
    );
    const res = NextResponse.redirect(errorUrl);
    res.cookies.delete("gmb_state");
    res.cookies.delete("gmb_return_to");
    return res;
  }
}
