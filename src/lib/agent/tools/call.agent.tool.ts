import { z } from "zod";
import { tool } from "ai";
import { selectVoiceWithAgent } from "../agents/voice.agent";

/**
 * Internal registry of specialized autonomous sub-agents powered by dedicated AI models.
 */
export const internalAgentRegistry: Record<
  string,
  (input: Record<string, unknown>) => Promise<unknown>
> = {
  voice_agent: async (input: Record<string, unknown>) => {
    const query = String(input.query || "").trim();
    const provider =
      input.provider === "elevenlabs" || input.provider === "google"
        ? input.provider
        : undefined;
    return await selectVoiceWithAgent({ query, provider });
  },
};

/**
 * Universal Sub-Agent Invocation Runner (Meta-Agent Runner).
 * Delegates cognitive workflows to dedicated autonomous sub-agents running specialized AI models.
 */
export const callAgentTool = tool({
  description:
    "Universal sub-agent invocation runner. Delegates cognitive tasks to dedicated autonomous sub-agents powered by specialized AI models (e.g. voice_agent for acoustic casting). Pass 'agent_name' (inspected via list_agents) and 'input' object.",
  inputSchema: z.object({
    agent_name: z
      .string()
      .describe(
        "The exact name of the autonomous sub-agent from list_agents (e.g. 'voice_agent')",
      ),
    input: z
      .object({})
      .passthrough()
      .default({})
      .describe("The task payload or specifications for the target sub-agent"),
  }),
  execute: async ({
    agent_name,
    input,
  }: {
    agent_name: string;
    input?: Record<string, unknown>;
  }) => {
    const rawName = String(agent_name || "")
      .trim()
      .toLowerCase();
    const targetAgent = internalAgentRegistry[rawName];

    if (!targetAgent) {
      console.warn(
        `[Tool:call_agent:NotFound] ❌ Sub-agent "${rawName}" not found in internal agent registry.`,
      );
      return `Error: Sub-agent '${agent_name}' not found. Available sub-agents from list_agents: ${Object.keys(
        internalAgentRegistry,
      ).join(", ")}`;
    }

    console.log(
      `[Tool:call_agent:Start] 🤖 Delegating cognitive workflow to sub-agent "${rawName}" with input:`,
      JSON.stringify(input || {}).slice(0, 160),
    );

    try {
      const result = await targetAgent(input || {});
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Tool:call_agent:Error] ❌ Exception in sub-agent "${rawName}":`,
        err,
      );
      return `Sub-agent delegation failed for '${rawName}': ${msg}`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
