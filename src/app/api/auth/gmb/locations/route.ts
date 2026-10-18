import { NextRequest, NextResponse } from "next/server";
import { GmbConnectorService } from "@/lib/services/connector";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: "Please login before viewing Google Business locations" },
        { status: 401 },
      );
    }

    const conn = await GmbConnectorService.getConnection(session.id);
    if (!conn) {
      return NextResponse.json(
        { error: "Google Business Profile not connected" },
        { status: 404 },
      );
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
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { error: "Please login before updating location" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { locationId } = body;

    if (!locationId) {
      return NextResponse.json(
        { error: "locationId is required" },
        { status: 400 },
      );
    }

    const conn = await GmbConnectorService.getConnection(session.id);
    if (!conn) {
      return NextResponse.json(
        { error: "Google Business Profile not connected" },
        { status: 404 },
      );
    }

    const matched = (conn.metadata.availableLocations || []).find(
      (l) => l.locationId === locationId,
    );

    await GmbConnectorService.updateActiveLocation(session.id, locationId);

    return NextResponse.json({
      success: true,
      activeLocation: matched || {
        locationId,
        locationName: conn.metadata.locationName,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
