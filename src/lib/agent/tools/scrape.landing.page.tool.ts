import { tool } from "ai";
import { z } from "zod";

export const scrapeLandingPageTool = tool({
  description:
    "Scrape a landing page or website URL to extract its main content, offer, pricing, and messaging. Use this to understand the user's business deeply.",
  inputSchema: z.object({
    url: z.string().url().describe("The full URL of the website to scrape."),
  }),
  execute: async (args: { url: string; title?: string; subtitle?: string }) => {
    const start = Date.now();
    console.log(`[Tool:scrape_landing_page:Start] url="${args.url}"`);
    try {
      const apiKey = process.env.FIRECRAWL_API_KEY;
      if (!apiKey) {
        console.warn(
          "[Tool:scrape_landing_page:MissingEnv] ⚠️ FIRECRAWL_API_KEY not set in environment.",
        );
        return "Error: FIRECRAWL_API_KEY environment variable is missing. (Mock mode: The website claims to offer premium software with AI integration at $49/mo).";
      }

      const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url: args.url,
          formats: ["markdown"],
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.statusText} (${response.status})`);
      }

      const data = await response.json();
      if (data && data.success && data.data && data.data.markdown) {
        console.log(
          `[Tool:scrape_landing_page:Success] ✅ Successfully scraped ${args.url} in ${Date.now() - start}ms (${data.data.markdown.length} chars)`,
        );
        // Return truncated markdown to save tokens
        return data.data.markdown.substring(0, 4000);
      }
      console.log(
        `[Tool:scrape_landing_page:Success] ✅ Completed scrape in ${Date.now() - start}ms`,
      );
      return JSON.stringify(data);
    } catch (e: unknown) {
      console.error(
        `[Tool:scrape_landing_page:Error] ❌ Failed to scrape ${args.url} after ${Date.now() - start}ms:`,
        e,
      );
      return `Error scraping website: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
