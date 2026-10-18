import { tool } from "ai";
import { z } from "zod";

export const DYNAMIC_EXECUTION_TOOLS = [
  {
    name: "search_web",
    description:
      "Performs live web searches using Tavily API. Arguments: { query: string, max_results?: number }.",
  },
  {
    name: "scrape_landing_page",
    description:
      "Extracts structured copy, headlines, and value propositions from a URL. Arguments: { url: string }.",
  },
  {
    name: "get_search_volume",
    description:
      "Queries search keyword monthly volume, CPC, and competition index. Arguments: { keywords: string[] }.",
  },
  {
    name: "search_ad_library",
    description:
      "Inspects competitor creative strategies and ad hooks in Meta Ad Library. Arguments: { query: string, platform?: 'facebook' | 'instagram', country?: string }.",
  },
  {
    name: "validate_meta_interests",
    description:
      "Validates ad targeting interest keywords against Meta Graph API. Arguments: { interests: string[] }.",
  },
  {
    name: "generate_images",
    description:
      "Generates marketing visuals, ad creatives, flyers, or video anchor stills. Pass all requested variants or video shot stills concurrently in the 'images' array (e.g. 4 stills for a 4-shot video). Arguments: { storage_path?: string (e.g. 'marketing-tool' or 'videos/<id>/shots'), images: Array<{ id?: string, prompt: string, aspect_ratio?: '1:1' | '9:16' | '16:9' | '4:5', format?: 'webp' | 'png' }> }.",
  },
  {
    name: "generate_video",
    description:
      "Generates a vertical (9:16) video ad with SeaDance motion video and TTS narration. For multi-shot videos, pass all shots in the 'shots' array with their anchor still image_urls (generated in parallel via generate_images with aspect_ratio: '9:16'). Arguments: { title: string, project_id?: string, shots?: Array<{ id?: string, image_url: string, motion_prompt: string, duration_sec?: number }>, image_url?: string, motion_prompt?: string, voiceover_script?: string, voice_id?: string, offer_headline?: string }. Supports customizable duration (e.g., 15s, 20s, 25s, 30s) and multi-shot clip sequences.",
  },
  {
    name: "retry_video_render",
    description:
      "Re-retrieves plan.json from Cloudflare R2 for an existing project and sends it straight to the FFmpeg render server to re-stitch the final video. Use when video clips exist but stitching failed or needs retry. Arguments: { project_id: string, title?: string }.",
  },
  {
    name: "post_to_gmb",
    description:
      "Publishes updates or announcements with photos to Google Business Profile. Arguments: { summary: string, photo_url?: string }.",
  },
  {
    name: "fetch_gmb_reviews",
    description:
      "Fetches customer reviews, star ratings, and reply statuses for Google Business location. Arguments: { page_size?: number }.",
  },
  {
    name: "reply_gmb_review",
    description:
      "Publishes a professional reply to a customer's Google review. Arguments: { review_name: string, comment: string }.",
  },
  {
    name: "get_user_orgs",
    description:
      "Retrieves the user's GrowEasy organization ID. Arguments: {}.",
  },
  {
    name: "list_campaigns",
    description:
      "Lists live or completed GrowEasy ad campaigns. Arguments: { org_id: string }.",
  },
  {
    name: "get_campaign_daily_stats",
    description:
      "Queries daily metrics (impressions, clicks, spend, leads) for a GrowEasy campaign. Arguments: { campaign_id: string, start_date?: string, end_date?: string }.",
  },
  {
    name: "get_campaign_breakdowns",
    description:
      "Analyzes campaign performance breakdowns. Arguments: { campaign_id: string, breakdown_by: 'location' | 'demographics' | 'ad_copy' | 'keyword' | 'media' | 'platform' }.",
  },
];

export const CONNECTOR_RULES = `
CRITICAL RULES FOR CONNECTORS:
- Google Business Profile (GMB):
  - For fetching reviews, replying to reviews, posting festive photos, or publishing updates to Google Maps/Search: Execute fetch_gmb_reviews, reply_gmb_review, or post_to_gmb via call_tool.
  - NEVER call get_user_orgs or GrowEasy campaign tools for GMB tasks!
  - If Google Business Profile is not connected or a call indicates it's missing, instruct the user to connect it via Connectors (+ menu in the chat bar).
- GrowEasy MCP:
  - Only call get_user_orgs, list_campaigns, get_campaign_daily_stats, or get_campaign_breakdowns when the user specifically asks to manage or inspect GrowEasy ad campaigns.
`;

export const listToolsTool = tool({
  description:
    "List all available dynamic execution tools, required arguments, and connector operational rules. Call this tool to inspect available capabilities before calling call_tool.",
  inputSchema: z.object({}),
  execute: async () => {
    console.log(
      "[Tool:list_tools] Returning list of available dynamic execution tools...",
    );
    let markdown = "### Available Dynamic Execution Tools\n\n";
    markdown +=
      "Execute any of the following tools dynamically using the `call_tool` meta-runner:\n";
    markdown += "Syntax: `call_tool({ tool_name: '<tool_name>', arguments: { ... } })`\n\n";

    for (const t of DYNAMIC_EXECUTION_TOOLS) {
      markdown += `- **\`${t.name}\`**: ${t.description}\n`;
    }

    markdown += `\n${CONNECTOR_RULES.trim()}`;
    return markdown;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
