import { tool } from "ai";
import { z } from "zod";

export const getSearchVolumeTool = tool({
  description:
    "Fetch real search volume, CPC, and keyword difficulty for a given seed keyword from Google Ads using DataForSEO.",
  parameters: z.object({
    keywords: z.array(z.string()).describe("Array of keywords to look up."),
    location_name: z.string().optional().describe("Location name, e.g., 'United States' or 'India'."),
  }),
  execute: async (args: { keywords: string[]; location_name?: string; title?: string; subtitle?: string }) => {
    
    const outOfFundsMessage = "SYSTEM MESSAGE: The DataForSEO API rejected the request because the account needs to be verified or funds need to be added. DO NOT hallucinate numbers. Reply politely to the user explaining that the keyword data API is currently out of budget, but offer to proceed with brainstorming keywords using your general marketing knowledge without specific search volume numbers.";

    try {
      const login = process.env.DATAFORSEO_LOGIN;
      const password = process.env.DATAFORSEO_PASSWORD;
      
      if (!login || !password) {
        return outOfFundsMessage;
      }

      const post_array = [];
      post_array.push({
        keywords: args.keywords,
        location_name: args.location_name || "United States",
        language_name: "English"
      });

      const response = await fetch("https://api.dataforseo.com/v3/keywords_data/google/search_volume/live", {
        method: "POST",
        headers: {
          "Authorization": "Basic " + Buffer.from(login + ":" + password).toString("base64"),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(post_array),
      });

      const data = await response.json();
      
      // If DataForSEO returns an auth/payment error (e.g., 40104 or 40200)
      if (data.status_code && data.status_code !== 20000) {
         console.warn("DataForSEO API error:", data.status_message);
         return outOfFundsMessage;
      }

      return JSON.stringify(data);
    } catch (e: unknown) {
       console.warn("Exception in Search Volume Tool:", e);
       return outOfFundsMessage;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
