import { db } from "@/lib/db";
import { oauthConnections } from "@/lib/drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  CONNECTOR_REGISTRY,
  ProviderType,
  ProviderMetadata,
  TypedConnection,
} from "@/lib/connectors/connectors.registry";

export class BaseConnectorService {
  /**
   * Fetch a typed, validated connection for a given provider strictly scoped to a user.
   */
  static async getConnection<P extends ProviderType>(
    provider: P,
    userId: string,
    orgId?: string,
  ): Promise<TypedConnection<P> | null> {
    try {
      if (!userId) {
        console.warn(
          `[BaseConnectorService] getConnection called without userId for ${provider}`,
        );
        return null;
      }

      const conditions = [
        eq(oauthConnections.provider, provider),
        eq(oauthConnections.user_id, userId),
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
        console.warn(
          `[BaseConnectorService] Invalid metadata for ${provider}:`,
          parsed.error,
        );
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
      console.error(
        `[BaseConnectorService] Failed to fetch ${provider} connection for user ${userId}:`,
        err,
      );
      return null;
    }
  }

  /**
   * Save or update a typed connection for a user.
   */
  static async saveConnection<P extends ProviderType>(params: {
    provider: P;
    userId: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    scope?: string;
    orgId?: string | null;
    metadata: ProviderMetadata<P>;
  }) {
    try {
      if (!params.userId) {
        throw new Error(
          `Cannot save ${params.provider} connection without an authenticated userId.`,
        );
      }

      const schema = CONNECTOR_REGISTRY[params.provider];
      const validatedMetadata = schema.parse(params.metadata);

      const expiresAt = params.expiresIn
        ? new Date(Date.now() + params.expiresIn * 1000)
        : null;

      // Upsert by checking existing connection for (provider, userId)
      const conditions = [
        eq(oauthConnections.provider, params.provider),
        eq(oauthConnections.user_id, params.userId),
      ];

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
      console.error(
        `[BaseConnectorService] Failed to save ${params.provider} connection for user ${params.userId}:`,
        err,
      );
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Disconnect a provider connection for a user.
   */
  static async disconnectConnection(
    provider: ProviderType,
    userId: string,
    orgId?: string,
  ) {
    try {
      if (!userId) {
        return { success: false, error: "Missing userId" };
      }

      const conditions = [
        eq(oauthConnections.provider, provider),
        eq(oauthConnections.user_id, userId),
      ];

      if (orgId) {
        conditions.push(eq(oauthConnections.org_id, orgId));
      }

      await db
        .update(oauthConnections)
        .set({ status: "disconnected", updated_at: new Date() })
        .where(and(...conditions));

      return { success: true };
    } catch (err) {
      console.error(
        `[BaseConnectorService] Failed to disconnect ${provider} for user ${userId}:`,
        err,
      );
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * List all active connections for a specific user.
   */
  static async getAllUserConnections(userId: string) {
    try {
      if (!userId) return {};

      const rows = await db
        .select()
        .from(oauthConnections)
        .where(
          and(
            eq(oauthConnections.user_id, userId),
            eq(oauthConnections.status, "connected"),
          ),
        )
        .orderBy(desc(oauthConnections.updated_at));

      const map: Record<
        string,
        {
          connected: boolean;
          metadata: Record<string, unknown>;
          updatedAt: Date | null;
        }
      > = {};

      for (const row of rows) {
        if (!map[row.provider]) {
          map[row.provider] = {
            connected: true,
            metadata: (row.metadata as Record<string, unknown>) || {},
            updatedAt: row.updated_at,
          };
        }
      }
      return map;
    } catch (err) {
      console.error(
        `[BaseConnectorService] Failed to get connections for user ${userId}:`,
        err,
      );
      return {};
    }
  }
}
