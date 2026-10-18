import { z } from "zod";
import { tool } from "ai";
import { GmbService, type GmbReview } from "@/lib/services";

export const fetchGmbReviewsTool = tool({
  description:
    "Fetch customer reviews from the connected Google Business Profile, including ratings, reviewer details, customer comments, and reply status.",
  inputSchema: z.object({
    page_size: z
      .number()
      .optional()
      .describe("Number of reviews to fetch (default 10, max 50)"),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    const start = Date.now();
    console.log(`[Tool:GMB:fetch_reviews:Start] pageSize=${args.page_size || 10}`);
    try {
      const data = await GmbService.fetchReviews({
        pageSize: args.page_size || 10,
      });
      console.log(
        `[Tool:GMB:fetch_reviews:Success] ✅ Retrieved ${data.reviews?.length || 0} reviews in ${Date.now() - start}ms`,
      );
      if (!data.reviews || data.reviews.length === 0) {
        return "No reviews found for this Google Business Profile location.";
      }

      const ratingMap: Record<string, number> = {
        ONE: 1,
        TWO: 2,
        THREE: 3,
        FOUR: 4,
        FIVE: 5,
      };

      const formatted = (data.reviews as GmbReview[])
        .map((r: GmbReview, i: number) => {
          const ratingNum = ratingMap[r.starRating] || 5;

          const stars = "★".repeat(ratingNum) + "☆".repeat(5 - ratingNum);
          const replied = r.reviewReply
            ? `[Replied: "${r.reviewReply.comment}"]`
            : "[Needs Reply]";

          return `${i + 1}. Review ID: ${r.reviewId}\n   Reviewer: ${r.reviewer.displayName} (${stars})\n   Date: ${new Date(r.createTime).toLocaleDateString()}\n   Comment: ${r.comment || "(No comment written)"}\n   Status: ${replied}\n`;
        })
        .join("\n");

      return `Fetched ${data.reviews.length} reviews:\n\n${formatted}\nAverage Rating: ${data.averageRating || "N/A"}`;
    } catch (err: unknown) {
      console.error(
        `[Tool:GMB:fetch_reviews:Error] ❌ Failed after ${Date.now() - start}ms:`,
        err,
      );
      return "Unable to retrieve Google Business reviews at this moment. Please ensure your Google Business Profile is connected in Connectors (+ menu), or reach out to our team if you need assistance.";
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);

export const replyGmbReviewTool = tool({
  description:
    "Publish an official business reply to a specific customer review on Google Business Profile.",
  inputSchema: z.object({
    review_id: z
      .string()
      .describe("The unique reviewId or review path from fetchGmbReviewsTool."),
    reply_comment: z
      .string()
      .describe(
        "The response message to the customer (polite, personalized, and professional).",
      ),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    const start = Date.now();
    console.log(
      `[Tool:GMB:reply_review:Start] review_id="${args.review_id}", reply="${(args.reply_comment || "").slice(0, 80)}..."`,
    );
    try {
      await GmbService.replyToReview({
        reviewId: args.review_id,
        comment: args.reply_comment,
      });

      console.log(
        `[Tool:GMB:reply_review:Success] ✅ Reply posted to review ${args.review_id} in ${Date.now() - start}ms`,
      );

      return `Successfully posted reply to review ${args.review_id}: "${args.reply_comment}"`;
    } catch (err: unknown) {
      console.error(
        `[Tool:GMB:reply_review:Error] ❌ Failed to post reply after ${Date.now() - start}ms:`,
        err,
      );
      return "Unable to post your reply to Google Business Profile at this moment. Please check your connection under Connectors (+ menu) or contact our team for assistance.";
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
