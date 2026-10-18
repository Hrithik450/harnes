import { fetchSkillTool } from "./fetch.skill.tool";
import { listSkillsTool } from "./list.skills.tool";
import { listToolsTool } from "./list.tools.tool";
import { listAgentsTool } from "./list.agents.tool";
import { callAgentTool } from "./call.agent.tool";
import { callTool } from "./call.tool";

export * from "./registry";
export * from "./call.tool";
export * from "./call.agent.tool";
export * from "./list.skills.tool";
export * from "./list.tools.tool";
export * from "./list.agents.tool";
export * from "./fetch.skill.tool";
export * from "./retry.video.render.tool";

export const agentTools = {
  list_skills: listSkillsTool,
  fetch_skill: fetchSkillTool,
  list_tools: listToolsTool,
  call_tool: callTool,
  list_agents: listAgentsTool,
  call_agent: callAgentTool,
};
