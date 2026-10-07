import { tool } from "ai";
import { z } from "zod";

export const scrapeLandingPageTool = tool({
  description:
    "Scrape a landing page or website URL to extract its main content, offer, pricing, and messaging. Use this to understand the user's business deeply.",
  parameters: z.object({
    url: z.string().url().describe("The full URL of the website to scrape."),
    title: z
      .string()
      .describe(
        "A short, user-friendly description of your current thought process (e.g., 'Analyzing website...').",
      ),
    subtitle: z
      .string()
      .describe(
        "A brief explanation of what you are reading (e.g., 'Extracting core offers and USPs').",
      ),
  }),
  execute: async (args: { url: string; title?: string; subtitle?: string }) => {
    try {
      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
        return "Error: FIRECRAWL_API_KEY environment variable is missing. (Mock mode: The website claims to offer premium software with AI integration at $49/mo).";
      }

      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          url: args.url,
          formats: ["markdown"]
        }),
      });

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data && data.success && data.data && data.data.markdown) {
         // Return truncated markdown to save tokens
         return data.data.markdown.substring(0, 4000);
      }
      return JSON.stringify(data);
    } catch (e: unknown) {
      return `Error scraping website: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
