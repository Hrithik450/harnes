import { tool } from "ai";
import { z } from "zod";

export const SKILL_DEFINITIONS = [
  {
    name: "creative_brief_generator",
    trigger:
      "Use this skill whenever the user asks to create an ad campaign brief, creative brief, audience personas, or ad copy for their business.",
  },
  {
    name: "facebook_audience_builder",
    trigger:
      "Build structured, ready-to-use Meta (Facebook and Instagram) ad audiences and Ideal Customer Profiles.",
  },
  {
    name: "lead_cost_calculator",
    trigger:
      "Estimate cost per lead (CPL), ad budget, cost per acquisition, break-even CPL, ROI, etc.",
  },
  {
    name: "competitor_research",
    trigger:
      "Produce an actionable competitor research report for any product, service, brand, or commercial project (including real estate developments, local businesses, clinics, B2B, DTC) using web search.",
  },
  {
    name: "marketing_strategist",
    trigger:
      "Build a complete, high-intent digital marketing strategy for any product, service or business.",
  },
  {
    name: "ad_copywriter",
    trigger:
      "Write campaign-ready paid ad copy for Facebook/Instagram (Meta) and Google Search.",
  },
  {
    name: "keyword_suggestions",
    trigger:
      "Research and prioritise SEO and PPC keywords using external keyword tools for real search volume.",
  },
  {
    name: "marketing_poster",
    trigger:
      "Generate highly detailed marketing posters, ad creatives, and banners based on user requests.",
  },
  {
    name: "brief_to_fast_cut_video",
    trigger:
      "Transform a campaign brief, product, or idea into a broadcast-ready 9:16 vertical video ad package or script (timed VO script, shot list, visual style bible, anchor stills, motion prompts, voice & music specs, persistent offer block, assembly plan, and QA compliance).",
  },
];

export const listSkillsTool = tool({
  description:
    "List all available specialized skills and their trigger conditions. Call this tool to dynamically discover which skill to fetch for a user request.",
  inputSchema: z.object({}),
  execute: async () => {
    console.log("[Tool:list_skills] Returning list of available skills...");
    let markdown = "### Available Skills\n\n";
    markdown +=
      "Map the user's request to one of these skills and call `fetch_skill` with the skill name to retrieve operating procedures and guidelines:\n\n";
    for (const skill of SKILL_DEFINITIONS) {
      markdown += `- **${skill.name}**: ${skill.trigger}\n`;
    }
    return markdown;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
