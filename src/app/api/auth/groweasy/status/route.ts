import { NextRequest, NextResponse } from "next/server";
import { GrowEasyConnectorService } from "@/lib/services/connector";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  const cookieToken = request.cookies.get("ge_access_token")?.value;
  const dbConnection = session
    ? await GrowEasyConnectorService.getConnection(session.id)
    : null;

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

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  // Disconnect / logout action: remove from database and delete cookies
  if (session) {
    await GrowEasyConnectorService.disconnect(session.id);
  }

  const response = NextResponse.json({ success: true, connected: false });
  response.cookies.delete("ge_access_token");
  response.cookies.delete("ge_refresh_token");
  return response;
}
