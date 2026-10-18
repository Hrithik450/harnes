import { tool } from "ai";
import { z } from "zod";
import { internalToolRegistry } from "./registry";

/**
 * Universal dynamic tool execution runner (Meta-Tool).
 * Allows the AI orchestrator to execute any tool from the internal registry on-demand,
 * drastically reducing input token bloat by avoiding sending 20+ tool schemas on every turn.
 */
export const callTool = tool({
  description:
    "Universal dynamic tool execution runner. Use this tool to execute any available marketing tool, platform connector, image/video generator, or web scraper on-demand. Pass the exact 'tool_name' (inspected via list_tools) and the required 'arguments' object.",
  inputSchema: z.object({
    tool_name: z
      .string()
      .describe(
        "The exact name of the tool to execute from list_tools (e.g. 'generate_images', 'generate_video', 'search_web', 'post_to_gmb', 'voice_agent', etc.)",
      ),
    arguments: z
      .object({})
      .passthrough()
      .default({})
      .describe("The arguments object required by the target tool"),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async ({ tool_name, arguments: args }: any) => {
    const rawName = String(tool_name || "").trim().toLowerCase();
    const targetTool = internalToolRegistry[rawName];

    if (!targetTool) {
      console.warn(
        `[Tool:call_tool:NotFound] ❌ Tool "${rawName}" not found in internal registry.`,
      );
      return `Error: Tool '${tool_name}' not found. Available executable tools from list_tools: ${Object.keys(
        internalToolRegistry,
      ).join(", ")}`;
    }

    console.log(
      `[Tool:call_tool:Start] 🚀 Meta-runner executing "${rawName}" with args:`,
      JSON.stringify(args || {}).slice(0, 160),
    );

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (targetTool as any).execute(args || {});
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Tool:call_tool:Error] ❌ Exception during execution of "${rawName}":`,
        err,
      );
      return `Tool execution failed for '${rawName}': ${msg}`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
