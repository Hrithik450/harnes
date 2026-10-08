import { tool } from "ai";
import { z } from "zod";

export const searchWebTool = tool({
  description:
    "Search the web for current information, competitor data, or news using the Tavily API.",
  parameters: z.object({
    query: z.string().describe("The search query to execute."),
  }),
  execute: async (args: { query: string; title?: string; subtitle?: string }) => {
    try {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        return "Error: TAVILY_API_KEY environment variable is missing.";
      }

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: args.query,
          search_depth: "advanced",
          include_answer: true,
          max_results: 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();
      return JSON.stringify({
        answer: data.answer,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results: data.results?.map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
        })),
      });
    } catch (e: unknown) {
      return `Error performing web search: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
