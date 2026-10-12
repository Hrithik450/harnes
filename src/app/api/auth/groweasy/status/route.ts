import { NextRequest, NextResponse } from "next/server";
import { OAuthConnectionService } from "@/lib/services/oauth.connection.service";

export async function GET(request: NextRequest) {
  const cookieToken = request.cookies.get("ge_access_token")?.value;
  const dbConnection = await OAuthConnectionService.getGrowEasyConnection();

  const token = cookieToken || dbConnection?.accessToken;
  const orgId = dbConnection?.orgId || null;

  const isConnected = Boolean(token && token.length > 10);
  const source = cookieToken
    ? "oauth_cookie"
    : dbConnection?.accessToken
      ? "oauth_database"
      : null;

  return NextResponse.json({
    connected: isConnected,
    orgId: isConnected ? orgId : null,
    source,
  });
}

export async function POST() {
  // Disconnect / logout action: remove from database and delete cookies
  await OAuthConnectionService.deleteGrowEasyConnection();

  const response = NextResponse.json({ success: true, connected: false });
  response.cookies.delete("ge_access_token");
  response.cookies.delete("ge_refresh_token");
  return response;
}
