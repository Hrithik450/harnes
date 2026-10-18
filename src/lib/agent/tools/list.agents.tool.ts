import { tool } from "ai";
import { z } from "zod";

function getActiveModelLabel(): string {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase().trim();
  if (provider === "google") {
    return "gemini-2.5-flash";
  }
  return process.env.OPENAI_MODEL || "gpt-4o";
}

export function getAgentDefinitions() {
  const model = getActiveModelLabel();
  return [
    {
      name: "voice_agent",
      model,
      description: `Voice Casting Sub-Agent (powered by ${model}). Acoustically evaluates a natural language voice query specifying Gender (Male/Female, mandatory), optional Accent (American, British, Australian), and desired musical/acoustic sound, and casts the single best VoiceProfile from the active voice catalog. Returns the complete VoiceProfile object.`,
    },
    {
      name: "context_agent",
      model,
      description: `Autonomous Conversation History Slicer Sub-Agent (powered by ${model}). Pre-evaluates incoming queries against a compact skeleton index of past turns, determines standalone status vs follow-ups, and surgically slices relevant lines of historical AI messages using internal numerical line tools to prevent token bloat.`,
    },
  ];
}

export const AGENT_DEFINITIONS = getAgentDefinitions();

export const listAgentsTool = tool({
  description:
    "List all available specialized sub-agents and their underlying AI model specifications. Call this tool to dynamically discover which sub-agent to invoke for complex cognitive or multi-step casting workflows.",
  inputSchema: z.object({}),
  execute: async () => {
    console.log("[Tool:list_agents] Returning list of available sub-agents...");
    const agents = getAgentDefinitions();
    let markdown =
      "### Available Autonomous Sub-Agents (Callable via `call_agent`)\n\n";
    markdown +=
      "These sub-agents execute dedicated specialized AI models for autonomous cognitive workflows.\n";
    markdown +=
      "Syntax: `call_agent({ agent_name: '<agent_name>', input: { ... } })`\n\n";
    for (const agent of agents) {
      markdown += `- **\`${agent.name}\`** *(Model: \`${agent.model}\`)*: ${agent.description}\n`;
    }
    return markdown;
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
