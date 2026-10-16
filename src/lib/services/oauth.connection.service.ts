import { db } from "@/lib/db";
import { oauthConnections } from "@/lib/drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  CONNECTOR_REGISTRY,
  ProviderType,
  ProviderMetadata,
  TypedConnection,
} from "@/lib/connectors/connectors.registry";

export class OAuthConnectionService {
  /**
   * Fetch a typed, validated connection for a given provider.
   * If orgId is provided, matches that specific workspace/org;
   * otherwise retrieves the most recently updated active connection.
   */
  static async getConnection<P extends ProviderType>(
    provider: P,
    orgId?: string
  ): Promise<TypedConnection<P> | null> {
    try {
      const conditions = [
        eq(oauthConnections.provider, provider),
        eq(oauthConnections.status, "connected"),
      ];
      if (orgId) {
        conditions.push(eq(oauthConnections.org_id, orgId));
      }

      const rows = await db
        .select()
        .from(oauthConnections)
        .where(and(...conditions))
        .orderBy(desc(oauthConnections.updated_at))
        .limit(1);

      if (!rows.length) return null;
      const row = rows[0];

      // Validate metadata using provider schema
      const rawMetadata = row.metadata || {};
      const schema = CONNECTOR_REGISTRY[provider];
      const parsed = schema.safeParse(rawMetadata);
      if (!parsed.success) {
        console.warn(`[OAuthConnectionService] Invalid metadata for ${provider}:`, parsed.error);
        return null;
      }

      return {
        id: row.id,
        orgId: row.org_id || "",
        userId: row.user_id,
        provider,
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        expiresAt: row.expires_at,
        status: row.status as "connected" | "expired" | "disconnected",
        metadata: parsed.data as ProviderMetadata<P>,
        createdAt: row.created_at || new Date(),
        updatedAt: row.updated_at || new Date(),
      };
    } catch (err) {
      console.error(`[OAuthConnectionService] Failed to fetch ${provider} connection:`, err);
      return null;
    }
  }

  /**
   * Save or update a typed connection with validated metadata
   */
  static async saveConnection<P extends ProviderType>(params: {
    provider: P;
    orgId?: string | null;
    userId?: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    scope?: string;
    metadata: ProviderMetadata<P>;
  }) {
    try {
      const schema = CONNECTOR_REGISTRY[params.provider];
      const validatedMetadata = schema.parse(params.metadata);

      const expiresAt = params.expiresIn
        ? new Date(Date.now() + params.expiresIn * 1000)
        : null;

      // Upsert by checking existing connection for provider (and orgId if specified)
      const conditions = [eq(oauthConnections.provider, params.provider)];
      if (params.orgId) {
        conditions.push(eq(oauthConnections.org_id, params.orgId));
      }

      const existing = await db
        .select()
        .from(oauthConnections)
        .where(and(...conditions))
        .orderBy(desc(oauthConnections.updated_at))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(oauthConnections)
          .set({
            org_id: params.orgId ?? existing[0].org_id ?? "default",
            user_id: params.userId ?? existing[0].user_id,
            access_token: params.accessToken,
            refresh_token: params.refreshToken ?? existing[0].refresh_token,
            scope: params.scope ?? existing[0].scope,
            status: "connected",
            metadata: validatedMetadata as Record<string, unknown>,
            expires_at: expiresAt ?? existing[0].expires_at,
            updated_at: new Date(),
          })
          .where(eq(oauthConnections.id, existing[0].id));
      } else {
        await db.insert(oauthConnections).values({
          org_id: params.orgId || "default",
          user_id: params.userId,
          provider: params.provider,
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
          scope: params.scope,
          status: "connected",
          metadata: validatedMetadata as Record<string, unknown>,
          expires_at: expiresAt,
          updated_at: new Date(),
        });
      }

      return { success: true };
    } catch (err) {
      console.error(`[OAuthConnectionService] Failed to save ${params.provider} connection:`, err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Disconnect a provider connection
   */
  static async disconnectConnection(provider: ProviderType, orgId?: string) {
    try {
      const conditions = [eq(oauthConnections.provider, provider)];
      if (orgId) {
        conditions.push(eq(oauthConnections.org_id, orgId));
      }

      await db
        .update(oauthConnections)
        .set({ status: "disconnected", updated_at: new Date() })
        .where(and(...conditions));
      return { success: true };
    } catch (err) {
      console.error(`[OAuthConnectionService] Failed to disconnect ${provider}:`, err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * List all active connections
   */
  static async getAllConnections(orgId?: string) {
    try {
      const conditions = [eq(oauthConnections.status, "connected")];
      if (orgId) {
        conditions.push(eq(oauthConnections.org_id, orgId));
      }

      const rows = await db
        .select()
        .from(oauthConnections)
        .where(and(...conditions))
        .orderBy(desc(oauthConnections.updated_at));

      const map: Record<string, { connected: boolean; metadata: Record<string, unknown> }> = {};
      for (const row of rows) {
        if (!map[row.provider]) {
          map[row.provider] = {
            connected: true,
            metadata: (row.metadata as Record<string, unknown>) || {},
          };
        }
      }
      return map;
    } catch (err) {
      console.error("[OAuthConnectionService] Failed to get all connections:", err);
      return {};
    }
  }

  // --- Convenience helpers for GrowEasy MCP ---
  static async saveGrowEasyConnection(data: {
    accessToken: string;
    refreshToken?: string;
    orgId?: string;
    expiresIn?: number;
  }) {
    return this.saveConnection({
      provider: "groweasy",
      orgId: data.orgId || null,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      metadata: { defaultOrgId: data.orgId },
    });
  }

  static async getGrowEasyConnection(orgId?: string) {
    const conn = await this.getConnection("groweasy", orgId);
    if (!conn) return null;
    return {
      accessToken: conn.accessToken,
      refreshToken: conn.refreshToken ?? undefined,
      orgId: conn.metadata.defaultOrgId || conn.orgId || undefined,
      expiresAt: conn.expiresAt ?? undefined,
    };
  }

  static async deleteGrowEasyConnection(orgId?: string) {
    return this.disconnectConnection("groweasy", orgId);
  }

  // --- Convenience helpers for Google Business Profile ---
  static async getGmbConnection(orgId?: string) {
    return this.getConnection("google_gmb", orgId);
  }
}
