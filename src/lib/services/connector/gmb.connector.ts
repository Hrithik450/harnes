import { BaseConnectorService } from "./base.connector";
import {
  GmbMetadata,
  GmbMetadataSchema,
} from "@/lib/connectors/connectors.registry";

export class GmbConnectorService {
  /**
   * Retrieve active Google Business Profile connection for a user.
   */
  static async getConnection(userId: string) {
    return BaseConnectorService.getConnection("google_gmb", userId);
  }

  /**
   * Save or update Google Business Profile connection for a user.
   */
  static async saveConnection(params: {
    userId: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    scope?: string;
    metadata: GmbMetadata;
  }) {
    return BaseConnectorService.saveConnection({
      provider: "google_gmb",
      userId: params.userId,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresIn: params.expiresIn,
      scope: params.scope,
      metadata: params.metadata,
    });
  }

  /**
   * Switch or update the active Google Business Profile location for a user.
   */
  static async updateActiveLocation(userId: string, locationId: string) {
    const conn = await this.getConnection(userId);
    if (!conn) {
      throw new Error("Google Business Profile is not connected for this user.");
    }

    const available = conn.metadata.availableLocations || [];
    const matched = available.find((l) => l.locationId === locationId);

    if (!matched) {
      throw new Error("Selected location was not found in available locations.");
    }

    const updatedMetadata = GmbMetadataSchema.parse({
      ...conn.metadata,
      accountId: matched.accountId,
      locationId: matched.locationId,
      locationName: matched.locationName,
      address: matched.address,
    });

    const expiresIn = conn.expiresAt
      ? Math.floor((conn.expiresAt.getTime() - Date.now()) / 1000)
      : undefined;

    return this.saveConnection({
      userId,
      accessToken: conn.accessToken,
      refreshToken: conn.refreshToken ?? undefined,
      expiresIn: expiresIn && expiresIn > 0 ? expiresIn : undefined,
      metadata: updatedMetadata,
    });
  }

  /**
   * Disconnect Google Business Profile for a user.
   */
  static async disconnect(userId: string) {
    return BaseConnectorService.disconnectConnection("google_gmb", userId);
  }
}
