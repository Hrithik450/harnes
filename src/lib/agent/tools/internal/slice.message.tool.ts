import { tool } from "ai";
import { z } from "zod";
import { splitMessageLines } from "@/lib/utils";
import type { ThreadMessage } from "@/lib/repositories/types/thread.message.types";

/**
 * Creates an internal slice_message tool tied to the current in-memory conversation history.
 * Strictly internal to the Context Slicer Sub-Agent. Never exposed in public tool catalogs or system prompts.
 */
export function createSliceMessageTool(
  messagesMap: Map<string, ThreadMessage>,
) {
  return tool({
    description:
      "Internal line-slicing tool to inspect specific line ranges of a historical AI message by its UUID. Use this to read the relevant portion before deciding on the final context window.",
    inputSchema: z.object({
      message_id: z
        .string()
        .describe("The exact UUID of the message to inspect"),
      start_line: z
        .number()
        .int()
        .min(1)
        .default(1)
        .describe(
          "1-based line number to begin slicing from (e.g., 1 for top)",
        ),
      line_count: z
        .number()
        .int()
        .min(1)
        .max(40)
        .default(10)
        .describe("Number of lines to read (default: 10, max: 40)"),
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    execute: async ({ message_id, start_line, line_count }: any) => {
      const msg = messagesMap.get(message_id.trim());
      if (!msg) {
        return `Message UUID "${message_id}" not found in current memory map.`;
      }

      const allLines = splitMessageLines(msg.content.text);
      const startIndex = Math.max(0, start_line - 1);
      const endIndex = Math.min(allLines.length, startIndex + line_count);
      const slicedLines = allLines.slice(startIndex, endIndex);

      console.log(
        `[Tool:internal:slice_message] Sliced ID="${message_id}" lines ${startIndex + 1}-${endIndex} of ${allLines.length}`,
      );

      return `[Message ${message_id} | Lines ${startIndex + 1}-${endIndex} of ${allLines.length}]:\n${slicedLines.join("\n")}`;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}
