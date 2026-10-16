import { fetchSkillTool } from "./fetch.skill.tool";
import { searchWebTool } from "./search.web.tool";
import { scrapeLandingPageTool } from "./scrape.landing.page.tool";
import { getSearchVolumeTool } from "./get.search.volume.tool";
import { searchAdLibraryTool } from "./search.ad.library.tool";
import { validateMetaInterestsTool } from "./validate.meta.interests.tool";
import { generateMarketingPosterTool } from "./generate.marketing.poster.tool";
import {
  getUserOrgsTool,
  listCampaignsTool,
  getCampaignDailyStatsTool,
  getCampaignBreakdownsTool,
} from "./groweasy.mcp.tool";
import { postToGmbTool } from "./gmb.post.tool";
import { fetchGmbReviewsTool, replyGmbReviewTool } from "./gmb.reviews.tool";

export const agentTools = {
  fetch_skill: fetchSkillTool,
  search_web: searchWebTool,
  scrape_landing_page: scrapeLandingPageTool,
  get_search_volume: getSearchVolumeTool,
  search_ad_library: searchAdLibraryTool,
  validate_meta_interests: validateMetaInterestsTool,
  generate_marketing_poster: generateMarketingPosterTool,
  get_user_orgs: getUserOrgsTool,
  list_campaigns: listCampaignsTool,
  get_campaign_daily_stats: getCampaignDailyStatsTool,
  get_campaign_breakdowns: getCampaignBreakdownsTool,
  post_to_gmb: postToGmbTool,
  fetch_gmb_reviews: fetchGmbReviewsTool,
  reply_gmb_review: replyGmbReviewTool,
};
