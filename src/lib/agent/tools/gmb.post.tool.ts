import { z } from "zod";
import { tool } from "ai";
import { GmbService } from "@/lib/services/gmb.service";

export const postToGmbTool = tool({
  description:
    "Publish a festive photo, promotional update, or announcement post to the business's Google Business Profile (Google Maps & Search).",
  parameters: z.object({
    summary: z
      .string()
      .describe(
        "The caption or announcement text for the post, including festive greetings, offers, or details."
      ),
    image_url: z
      .string()
      .optional()
      .describe(
        "Public URL of the photo/poster to attach (e.g. from generateMarketingPosterTool)."
      ),
    action_type: z
      .enum(["LEARN_MORE", "CALL", "ORDER", "BOOK"])
      .optional()
      .describe("Optional Call to Action button type"),
    action_url: z
      .string()
      .optional()
      .describe("URL for the Call to Action button"),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    try {
      const result = await GmbService.createLocalPost({
        summary: args.summary,
        imageUrl: args.image_url,
        actionType: args.action_type,
        actionUrl: args.action_url,
      });

      return `Successfully published update to Google Business Profile! Post ID: ${
        result.name || "published"
      }. Search and Maps visitors can now see this announcement.`;
    } catch (err: unknown) {
      console.error("[postToGmbTool error]:", err);
      return "Unable to publish the post to Google Business Profile at this moment. Please check your connection in Connectors (+ menu) or contact our support team.";
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
