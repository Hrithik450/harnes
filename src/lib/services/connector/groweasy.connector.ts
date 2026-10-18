import { BaseConnectorService } from "./base.connector";

export class GrowEasyConnectorService {
  /**
   * Retrieve active GrowEasy MCP connection for a user.
   */
  static async getConnection(userId: string, orgId?: string) {
    const conn = await BaseConnectorService.getConnection(
      "groweasy",
      userId,
      orgId,
    );
    if (!conn) return null;

    return {
      id: conn.id,
      accessToken: conn.accessToken,
      refreshToken: conn.refreshToken ?? undefined,
      orgId: conn.metadata.defaultOrgId || conn.orgId || undefined,
      expiresAt: conn.expiresAt ?? undefined,
      metadata: conn.metadata,
      updatedAt: conn.updatedAt,
    };
  }

  /**
   * Save or update GrowEasy connection for a user.
   */
  static async saveConnection(params: {
    userId: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    orgId?: string;
  }) {
    return BaseConnectorService.saveConnection({
      provider: "groweasy",
      userId: params.userId,
      orgId: params.orgId || null,
      accessToken: params.accessToken,
      refreshToken: params.refreshToken,
      expiresIn: params.expiresIn,
      metadata: {
        defaultOrgId: params.orgId,
      },
    });
  }

  /**
   * Disconnect GrowEasy MCP for a user.
   */
  static async disconnect(userId: string, orgId?: string) {
    return BaseConnectorService.disconnectConnection("groweasy", userId, orgId);
  }
}
