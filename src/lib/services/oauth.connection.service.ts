import { db } from "@/lib/db";
import { oauthConnections } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

export interface GrowEasyConnectionData {
  accessToken: string;
  refreshToken?: string;
  orgId?: string;
  expiresIn?: number;
}

export class OAuthConnectionService {
  /**
   * Save or update the active GrowEasy connection in the database
   */
  static async saveGrowEasyConnection(data: GrowEasyConnectionData) {
    try {
      const expiresAt = data.expiresIn
        ? new Date(Date.now() + data.expiresIn * 1000)
        : null;

      await db
        .insert(oauthConnections)
        .values({
          provider: "groweasy",
          access_token: data.accessToken,
          refresh_token: data.refreshToken || null,
          org_id: data.orgId || process.env.GROWEASY_ORG_ID || "v73Grwxj6rdyYrwCr341",
          expires_at: expiresAt,
          updated_at: new Date(),
        })
        .onConflictDoUpdate({
          target: oauthConnections.provider,
          set: {
            access_token: data.accessToken,
            refresh_token: data.refreshToken || null,
            org_id: data.orgId || process.env.GROWEASY_ORG_ID || "v73Grwxj6rdyYrwCr341",
            expires_at: expiresAt,
            updated_at: new Date(),
          },
        });

      return { success: true };
    } catch (err: unknown) {
      console.error("[OAuthConnectionService] Failed to save GrowEasy connection:", err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Fetch the active GrowEasy connection from the database
   */
  static async getGrowEasyConnection() {
    try {
      const rows = await db
        .select()
        .from(oauthConnections)
        .where(eq(oauthConnections.provider, "groweasy"))
        .limit(1);

      if (rows.length === 0) return null;

      const record = rows[0];
      return {
        accessToken: record.access_token,
        refreshToken: record.refresh_token || undefined,
        orgId: record.org_id || undefined,
        expiresAt: record.expires_at || undefined,
      };
    } catch (err: unknown) {
      console.error("[OAuthConnectionService] Failed to fetch GrowEasy connection:", err);
      return null;
    }
  }

  /**
   * Delete the active GrowEasy connection from the database
   */
  static async deleteGrowEasyConnection() {
    try {
      await db
        .delete(oauthConnections)
        .where(eq(oauthConnections.provider, "groweasy"));
      return { success: true };
    } catch (err: unknown) {
      console.error("[OAuthConnectionService] Failed to delete GrowEasy connection:", err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
