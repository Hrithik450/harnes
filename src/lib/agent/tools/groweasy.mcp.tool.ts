import { z } from "zod";
import { tool } from "ai";
import { getGrowEasyMcpClient } from "../mcp";

export const getUserOrgsTool = tool({
  description:
    "List the organisations the authenticated user has access to with their org_id. Call this first to identify the user's active organization in GrowEasy.",
  parameters: z.object({
    title: z.string().optional().describe("Internal title for thought logging"),
    subtitle: z
      .string()
      .optional()
      .describe("Internal subtitle for thought logging"),
  }),
  execute: async () => {
    try {
      const client = getGrowEasyMcpClient();
      const res = await client.callTool("get_user_orgs", {});
      const text =
        res.content
          ?.map((c) => c.text)
          .filter(Boolean)
          .join("\n") || "";
      return text || JSON.stringify(res);
    } catch (err: unknown) {
      return `Error retrieving GrowEasy user organisations: ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

export const listCampaignsTool = tool({
  description:
    "List ad campaigns from GrowEasy for an organisation, with optional filters for status (LIVE, ARCHIVED, COMPLETED), date ranges, and pagination.",
  parameters: z.object({
    org_id: z
      .string()
      .optional()
      .describe(
        "The organization ID. If omitted, uses the user's configured org.",
      ),
    status: z
      .enum(["LIVE", "ARCHIVED", "COMPLETED"])
      .optional()
      .describe("Optional campaign status filter"),
    created_from: z
      .string()
      .optional()
      .describe("ISO 8601 date string for start of creation range"),
    created_to: z
      .string()
      .optional()
      .describe("ISO 8601 date string for end of creation range"),
    limit: z
      .number()
      .optional()
      .describe("Number of campaigns to return (default 20, max 100)"),
    last_cursor_id: z
      .string()
      .optional()
      .describe("Pagination cursor from previous response"),
    title: z.string().optional().describe("Internal title for thought logging"),
    subtitle: z
      .string()
      .optional()
      .describe("Internal subtitle for thought logging"),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    try {
      const client = getGrowEasyMcpClient();
      const orgId = args.org_id || client.getOrgId();
      const payload: Record<string, unknown> = { org_id: orgId };
      if (args.status) payload.status = args.status;
      if (args.created_from) payload.created_from = args.created_from;
      if (args.created_to) payload.created_to = args.created_to;
      if (args.limit) payload.limit = args.limit;
      if (args.last_cursor_id) payload.last_cursor_id = args.last_cursor_id;

      const res = await client.callTool("list_campaigns", payload);
      const text =
        res.content
          ?.map((c) => c.text)
          .filter(Boolean)
          .join("\n") || "";
      return text || JSON.stringify(res);
    } catch (err: unknown) {
      return `Error listing GrowEasy campaigns: ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

export const getCampaignDailyStatsTool = tool({
  description:
    "Get day-by-day performance metrics (spend, impressions, clicks, leads) for a specific GrowEasy campaign across a date range (capped to max 90 days).",
  parameters: z.object({
    org_id: z
      .string()
      .optional()
      .describe(
        "The organization ID. If omitted, uses the user's configured org.",
      ),
    campaign_id: z.string().describe("The specific GrowEasy campaign ID"),
    created_from: z
      .string()
      .describe("ISO 8601 date string start of range (max 90 days ago)"),
    created_to: z.string().describe("ISO 8601 date string end of range"),
    title: z.string().optional().describe("Internal title for thought logging"),
    subtitle: z
      .string()
      .optional()
      .describe("Internal subtitle for thought logging"),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    try {
      const client = getGrowEasyMcpClient();
      const orgId = args.org_id || client.getOrgId();
      const res = await client.callTool("get_campaign_daily_stats", {
        org_id: orgId,
        campaign_id: args.campaign_id,
        created_from: args.created_from,
        created_to: args.created_to,
      });
      const text =
        res.content
          ?.map((c) => c.text)
          .filter(Boolean)
          .join("\n") || "";
      return text || JSON.stringify(res);
    } catch (err: unknown) {
      return `Error fetching campaign daily stats: ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

export const getCampaignBreakdownsTool = tool({
  description:
    "Get campaign performance broken down by a specific segment: location, demographics, ad-copies, keywords, hour-range, media-assets, or platform.",
  parameters: z.object({
    org_id: z
      .string()
      .optional()
      .describe(
        "The organization ID. If omitted, uses the user's configured org.",
      ),
    campaign_id: z.string().describe("The specific GrowEasy campaign ID"),
    type: z
      .enum([
        "location",
        "demographics",
        "ad-copies",
        "keywords",
        "hour-range",
        "media-assets",
        "platform",
      ])
      .describe("Segment breakdown type"),
    title: z.string().optional().describe("Internal title for thought logging"),
    subtitle: z
      .string()
      .optional()
      .describe("Internal subtitle for thought logging"),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    try {
      const client = getGrowEasyMcpClient();
      const orgId = args.org_id || client.getOrgId();
      const res = await client.callTool("get_campaign_breakdowns", {
        org_id: orgId,
        campaign_id: args.campaign_id,
        type: args.type,
      });
      const text =
        res.content
          ?.map((c) => c.text)
          .filter(Boolean)
          .join("\n") || "";
      return text || JSON.stringify(res);
    } catch (err: unknown) {
      return `Error fetching campaign breakdowns: ${
        err instanceof Error ? err.message : String(err)
      }`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
