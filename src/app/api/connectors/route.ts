import { NextRequest, NextResponse } from "next/server";
import { OAuthConnectionService } from "@/lib/services/oauth.connection.service";
import {
  ProviderType,
  AVAILABLE_CONNECTORS,
} from "@/lib/connectors/connectors.registry";

export async function GET() {
  try {
    const connections = await OAuthConnectionService.getAllConnections();

    const result = AVAILABLE_CONNECTORS.map((connector) => {
      const active = connections[connector.id];
      return {
        ...connector,
        connected: Boolean(active?.connected),
        metadata: active?.metadata || null,
      };
    });

    return NextResponse.json({ connectors: result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, provider } = await request.json();

    if (action === "disconnect" && provider) {
      await OAuthConnectionService.disconnectConnection(
        provider as ProviderType,
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
