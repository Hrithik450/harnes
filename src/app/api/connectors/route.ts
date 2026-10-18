import { NextRequest, NextResponse } from "next/server";
import { BaseConnectorService } from "@/lib/services/connector";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  ProviderType,
  AVAILABLE_CONNECTORS,
} from "@/lib/connectors/connectors.registry";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);

    // If user is not authenticated, all connectors are disconnected
    const connections = session
      ? await BaseConnectorService.getAllUserConnections(session.id)
      : {};

    const result = AVAILABLE_CONNECTORS.map((connector) => {
      const active = connections[connector.id];
      return {
        ...connector,
        connected: Boolean(active?.connected),
        metadata: active?.metadata || null,
      };
    });

    return NextResponse.json({
      authenticated: Boolean(session),
      connectors: result,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: "Please login before managing connectors" },
        { status: 401 },
      );
    }

    const { action, provider } = await request.json();

    if (action === "disconnect" && provider) {
      await BaseConnectorService.disconnectConnection(
        provider as ProviderType,
        session.id,
      );
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
