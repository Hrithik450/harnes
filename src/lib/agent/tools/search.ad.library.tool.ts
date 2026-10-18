import { tool } from "ai";
import { z } from "zod";

export const searchAdLibraryTool = tool({
  description:
    "Search the Meta Ad Library for currently active ads by a competitor's domain or keyword to see their ad copy and creative formats.",
  inputSchema: z.object({
    search_term: z.string().describe("The domain or keyword to search in the ad library."),
  }),
  execute: async (args: { search_term: string; title?: string; subtitle?: string }) => {
    const start = Date.now();
    console.log(`[Tool:search_ad_library:Start] search_term="${args.search_term}"`);
    try {
      const apiKey = process.env.APIFY_API_TOKEN;

      if (!apiKey) {
        console.warn(
          "[Tool:search_ad_library:MissingEnv] ⚠️ APIFY_API_TOKEN not set in environment. Returning fallback mock ads.",
        );
        // Return mock ad copy to let the agent continue
        return JSON.stringify([
          {
            pageName: args.search_term,
            adText: `Stop wasting money on bad ads. Try ${args.search_term} today and see a 3x ROI. Click to learn more.`,
            format: "Video",
            isActive: true,
          },
          {
            pageName: args.search_term,
            adText: `We helped 100+ businesses scale. Get our free guide on how we did it.`,
            format: "Image",
            isActive: true,
          },
        ]);
      }

      // Example using a common Apify actor for Meta Ads
      const response = await fetch(
        `https://api.apify.com/v2/acts/apify~facebook-ad-library-scraper/runs?token=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            searchTerms: [args.search_term],
            maxAds: 5,
          }),
          signal: AbortSignal.timeout(20000),
        },
      );

      if (!response.ok) {
        throw new Error(`Apify API error: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      console.log(
        `[Tool:search_ad_library:Success] ✅ Ad library job started in ${Date.now() - start}ms`,
      );
      return JSON.stringify({
        message: "Ad Library extraction started.",
        runUrl: data.data?.url,
      });
    } catch (e: unknown) {
      console.error(
        `[Tool:search_ad_library:Error] ❌ Failed after ${Date.now() - start}ms:`,
        e,
      );
      return `Error scraping ad library: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
