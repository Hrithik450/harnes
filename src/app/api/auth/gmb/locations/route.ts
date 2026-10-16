import { NextRequest, NextResponse } from "next/server";
import { OAuthConnectionService } from "@/lib/services/oauth.connection.service";
import { GmbMetadataSchema } from "@/lib/connectors/connectors.registry";

export async function GET() {
  try {
    const conn = await OAuthConnectionService.getGmbConnection();
    if (!conn) {
      return NextResponse.json({ error: "GMB not connected" }, { status: 404 });
    }

    return NextResponse.json({
      activeLocationId: conn.metadata.locationId,
      activeLocationName: conn.metadata.locationName,
      availableLocations: conn.metadata.availableLocations || [
        {
          accountId: conn.metadata.accountId,
          locationId: conn.metadata.locationId,
          locationName: conn.metadata.locationName,
          address: conn.metadata.address,
        },
      ],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locationId } = body;

    if (!locationId) {
      return NextResponse.json({ error: "locationId is required" }, { status: 400 });
    }

    const conn = await OAuthConnectionService.getGmbConnection();
    if (!conn) {
      return NextResponse.json({ error: "GMB not connected" }, { status: 404 });
    }

    const available = conn.metadata.availableLocations || [];
    const matched = available.find((l) => l.locationId === locationId);

    if (!matched) {
      return NextResponse.json(
        { error: "Selected location is not in available locations" },
        { status: 400 }
      );
    }

    const updatedMetadata = GmbMetadataSchema.parse({
      ...conn.metadata,
      accountId: matched.accountId,
      locationId: matched.locationId,
      locationName: matched.locationName,
      address: matched.address,
    });

    await OAuthConnectionService.saveConnection({
      provider: "google_gmb",
      orgId: conn.orgId,
      accessToken: conn.accessToken,
      refreshToken: conn.refreshToken ?? undefined,
      expiresIn: conn.expiresAt
        ? Math.floor((conn.expiresAt.getTime() - Date.now()) / 1000)
        : undefined,
      metadata: updatedMetadata,
    });

    return NextResponse.json({ success: true, activeLocation: matched });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
