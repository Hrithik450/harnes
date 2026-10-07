import path from "path";

export const SKILL_REGISTRY = [
  {
    name: "creative_brief_generator",
    description:
      "Use this skill whenever the user asks to create an ad campaign brief, creative brief, audience personas, or ad copy for their business.",
    filePath: path.join(
      process.cwd(),
      "src/lib/agent/skills/creative.brief.generator.md",
    ),
  },
  {
    name: "facebook_audience_builder",
    description:
      "Build structured, ready-to-use Meta (Facebook and Instagram) ad audiences and Ideal Customer Profiles for any product, service or business, including demographics, an audience summary, behaviors, interests, education majors and work positions, plus a cold / warm / lookalike campaign structure, exclusions and budget split. Use this skill whenever the user asks about Meta or Facebook ad targeting, audience building, interest or behavior targeting, ideal customer profile (ICP), who to target, lookalikes, retargeting windows, audience overlap, exclusions, \"my ads aren't converting\", or how to structure a Meta campaign, even if they don't say \"audience builder\". Also use for follow-ups on an existing audience (refine, narrow, broaden, split by funnel stage, lead gen vs eCommerce setups).",
    filePath: path.join(
      process.cwd(),
      "src/lib/agent/skills/facebook.audience.builder.md",
    ),
  },
  {
    name: "lead_cost_calculator",
    description:
      "Estimate cost per lead (CPL) with optimistic and pessimistic benchmarks, plus expected leads, ad budget, cost per acquisition, break-even CPL, ROI and campaign feasibility, before launching paid ads. Use this skill whenever the user asks about cost per lead, CPL, lead cost, ad budget planning, \"how much will leads cost\", \"how much budget do I need for X leads\", expected conversions, campaign ROI, break-even, whether a campaign is financially viable, or CPL benchmarks by industry, city or channel (Facebook, Instagram, Google, YouTube, LinkedIn), even if they don't say \"calculator\". Also use for follow-ups on an existing estimate (change the budget, city, channel or price, compare scenarios, explain the formula).",
    filePath: path.join(
      process.cwd(),
      "src/lib/agent/skills/lead.cost.calculator.md",
    ),
  },
  {
    name: "competitor_research",
    description:
      "Produce an actionable competitor research report for any product, service or brand using web search. Use this skill whenever the user asks about competitors, competitive analysis, market analysis, 'who are my competitors', 'what are competitors doing', competitor ads or creatives, competitor messaging or USPs, positioning gaps, white space in a niche, SEO or keyword competitor analysis, or how to differentiate. Also use for follow-ups (go deeper on one competitor, compare two, find gaps, turn findings into messaging, ads or an SEO plan). ALWAYS use the `search_web` tool heavily to find real-time data before generating the report.",
    filePath: path.join(
      process.cwd(),
      "src/lib/agent/skills/competitor.research.md",
    ),
  },
  {
    name: "marketing_strategist",
    description:
      "Build a complete, high-intent digital marketing strategy for any product, service or business, covering core approach, ideal channel (Google vs Meta vs hybrid), campaign types and objectives, targeting and audience, key personas (problem, buying trigger, objection, why they convert), messaging themes with example hooks, and a tracking and CRM setup. Use this skill whenever the user asks for a marketing strategy or plan, campaign plan, go-to-market, 'how should I market X', 'where should I advertise', 'Google or Meta', 'how do I get leads/sales', channel mix, funnel structure, campaign structure, ad tracking setup, or says they are starting or scaling paid marketing, even if they never say 'strategy'.",
    filePath: path.join(
      process.cwd(),
      "src/lib/agent/skills/marketing.strategist.md",
    ),
  },
  {
    name: "video_script_generator",
    description:
      "Write ready-to-record video ad scripts (Hook, Body, CTA) for any product, service or business, in conversation-style, Q&A (creator + viewer), storytelling, testimonial-style, comparison and how-it-works formats, in English, Hinglish or Hindi, at a chosen duration (15, 30, 45 or 60 seconds). Use this skill whenever the user asks for a video script, ad script, reel or short-form script, UGC script, voiceover, founder or influencer script, product demo or explainer script, 'what should I say in my ad video', hooks for video ads, or video ad ideas, even if they never say 'script'.",
    filePath: path.join(
      process.cwd(),
      "src/lib/agent/skills/video.script.generator.md",
    ),
  },
  {
    name: "ad_copywriter",
    description:
      "Write campaign-ready paid ad copy for Facebook/Instagram (Meta) and Google Search, including headlines, primary text (short and long), descriptions and CTA buttons for Meta, and Responsive Search Ad (RSA) headlines, descriptions and display paths for Google, in English, Hinglish or Hindi. Use this skill whenever the user asks for ad copy, ad text, headlines, primary text, descriptions, taglines for ads, Facebook ad copy, Instagram ad copy, Google ads copy, RSA headlines, search ad copy, A/B copy variations, prospecting or retargeting copy, or 'write ads for my business', even if they don't name a platform.",
    filePath: path.join(
      process.cwd(),
      "src/lib/agent/skills/ad.copywriter.md",
    ),
  },
  {
    name: "keyword_suggestions",
    description:
      "Research and prioritise SEO and PPC keywords for any product, service or website using external keyword tools for real search volume and competition data, then cluster them by intent and theme, recommend page types and SEO-vs-PPC use, pick quick wins, and suggest ad-group buckets and negative keywords. Use this skill whenever the user asks for keywords, keyword ideas, keyword research, keyword suggestions, long-tail keywords, search volume, keyword difficulty or competition, SEO keywords, PPC or Google Ads keywords, topic clusters, content or blog planning from keywords, service-page keyword mapping, local (city + service) keywords, or 'what should I rank for / bid on', even if they never say 'keyword tool'.",
    filePath: path.join(
      process.cwd(),
      "src/lib/agent/skills/keyword.suggestions.md",
    ),
  },
];
