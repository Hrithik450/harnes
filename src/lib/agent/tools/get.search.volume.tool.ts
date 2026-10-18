import { tool } from "ai";
import { z } from "zod";

export const getSearchVolumeTool = tool({
  description:
    "Fetch real search volume, CPC, and keyword difficulty for a given seed keyword from Google Ads using DataForSEO.",
  inputSchema: z.object({
    keywords: z.array(z.string()).describe("Array of keywords to look up."),
    location_name: z
      .string()
      .optional()
      .describe("Location name, e.g., 'United States' or 'India'."),
  }),
  execute: async (args: {
    keywords: string[];
    location_name?: string;
    title?: string;
    subtitle?: string;
  }) => {
    const start = Date.now();
    console.log(
      `[Tool:get_search_volume:Start] keywords=[${args.keywords.join(", ")}], location=${args.location_name || "United States"}`,
    );

    const outOfFundsMessage =
      "SYSTEM MESSAGE: The DataForSEO API rejected the request because the account needs to be verified or funds need to be added. DO NOT hallucinate numbers. Reply politely to the user explaining that the keyword data API is currently out of budget, but offer to proceed with brainstorming keywords using your general marketing knowledge without specific search volume numbers.";

    try {
      const login = process.env.DATAFORSEO_LOGIN;
      const password = process.env.DATAFORSEO_PASSWORD;

      if (!login || !password) {
        console.warn(
          "[Tool:get_search_volume:MissingEnv] ⚠️ DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD not set in environment.",
        );
        return outOfFundsMessage;
      }

      const post_array = [];
      post_array.push({
        keywords: args.keywords,
        location_name: args.location_name || "United States",
        language_name: "English",
      });

      const response = await fetch(
        "https://api.dataforseo.com/v3/keywords_data/google/search_volume/live",
        {
          method: "POST",
          headers: {
            Authorization:
              "Basic " + Buffer.from(login + ":" + password).toString("base64"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(post_array),
          signal: AbortSignal.timeout(15000),
        },
      );

      const data = await response.json();

      // If DataForSEO returns an auth/payment error (e.g., 40104 or 40200)
      if (data.status_code && data.status_code !== 20000) {
        console.warn(
          `[Tool:get_search_volume:ApiError] ⚠️ DataForSEO error: code=${data.status_code}, message="${data.status_message}"`,
        );
        return outOfFundsMessage;
      }

      console.log(
        `[Tool:get_search_volume:Success] ✅ Received volume data in ${Date.now() - start}ms`,
      );
      return JSON.stringify(data);
    } catch (e: unknown) {
      console.error(
        `[Tool:get_search_volume:Error] ❌ Exception after ${Date.now() - start}ms:`,
        e,
      );
      return outOfFundsMessage;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
