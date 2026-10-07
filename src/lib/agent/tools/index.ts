import { fetchSkillTool } from "./fetch.skill.tool";
import { searchWebTool } from "./search.web.tool";
import { scrapeLandingPageTool } from "./scrape.landing.page.tool";
import { getSearchVolumeTool } from "./get.search.volume.tool";
import { searchAdLibraryTool } from "./search.ad.library.tool";
import { validateMetaInterestsTool } from "./validate.meta.interests.tool";

export const agentTools = {
  fetch_skill: fetchSkillTool,
  search_web: searchWebTool,
  scrape_landing_page: scrapeLandingPageTool,
  get_search_volume: getSearchVolumeTool,
  search_ad_library: searchAdLibraryTool,
  validate_meta_interests: validateMetaInterestsTool,
};
