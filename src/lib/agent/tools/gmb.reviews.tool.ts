import { z } from "zod";
import { tool } from "ai";
import { GmbService } from "@/lib/services/gmb.service";

export const fetchGmbReviewsTool = tool({
  description:
    "Fetch customer reviews from the connected Google Business Profile, including ratings, reviewer details, customer comments, and reply status.",
  parameters: z.object({
    page_size: z
      .number()
      .optional()
      .describe("Number of reviews to fetch (default 10, max 50)"),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    try {
      const data = await GmbService.fetchReviews({ pageSize: args.page_size || 10 });
      if (!data.reviews || data.reviews.length === 0) {
        return "No reviews found for this Google Business Profile location.";
      }

      const formatted = data.reviews.map((r, i) => {
        const ratingNum = {
          ONE: 1,
          TWO: 2,
          THREE: 3,
          FOUR: 4,
          FIVE: 5,
        }[r.starRating] || 5;

        const stars = "★".repeat(ratingNum) + "☆".repeat(5 - ratingNum);
        const replied = r.reviewReply ? `[Replied: "${r.reviewReply.comment}"]` : "[Needs Reply]";

        return `${i + 1}. Review ID: ${r.reviewId}\n   Reviewer: ${r.reviewer.displayName} (${stars})\n   Date: ${new Date(r.createTime).toLocaleDateString()}\n   Comment: ${r.comment || "(No comment written)"}\n   Status: ${replied}\n`;
      }).join("\n");

      return `Fetched ${data.reviews.length} reviews:\n\n${formatted}\nAverage Rating: ${data.averageRating || "N/A"}`;
    } catch (err: unknown) {
      console.error("[fetchGmbReviewsTool error]:", err);
      return "Unable to retrieve Google Business reviews at this moment. Please ensure your Google Business Profile is connected in Connectors (+ menu), or reach out to our team if you need assistance.";
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

export const replyGmbReviewTool = tool({
  description:
    "Publish an official business reply to a specific customer review on Google Business Profile.",
  parameters: z.object({
    review_id: z
      .string()
      .describe(
        "The unique reviewId or review path from fetchGmbReviewsTool."
      ),
    reply_comment: z
      .string()
      .describe(
        "The response message to the customer (polite, personalized, and professional)."
      ),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    try {
      await GmbService.replyToReview({
        reviewId: args.review_id,
        comment: args.reply_comment,
      });

      return `Successfully posted reply to review ${args.review_id}: "${args.reply_comment}"`;
    } catch (err: unknown) {
      console.error("[replyGmbReviewTool error]:", err);
      return "Unable to post your reply to Google Business Profile at this moment. Please check your connection under Connectors (+ menu) or contact our team for assistance.";
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
