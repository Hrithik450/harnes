import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getGmbAuthUrl } from "@/lib/auth/gmb.oauth";

export async function GET(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.host;
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  const state = crypto.randomBytes(24).toString("hex");
  const authUrl = getGmbAuthUrl(origin, state);

  const rawReturnTo = request.nextUrl.searchParams.get("return_to") || "/";
  // Safe redirect path validation: must start with single / and not //
  const returnTo =
    rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//")
      ? rawReturnTo
      : "/";

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("gmb_state", state, {
    httpOnly: true,
    secure: proto === "https",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  response.cookies.set("gmb_return_to", returnTo, {
    httpOnly: true,
    secure: proto === "https",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
