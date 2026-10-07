import { SKILL_REGISTRY } from "../skills";
import { tool } from "ai";
import { z } from "zod";
import fs from "fs";

export const fetchSkillTool = tool({
  description:
    "Consult the internal knowledge base for detailed instructions and procedures for a specific module or skill. Call this when you need to know how to perform a task.",
  parameters: z.object({
    module_name: z
      .string()
      .describe("The name of the module or skill to fetch"),
    title: z
      .string()
      .describe(
        "A short, user-friendly description of your current thought process (e.g., 'Consulting knowledge base...').",
      ),
    subtitle: z
      .string()
      .describe(
        "A brief explanation of what you are reading in this step (e.g., 'Loading Audience Builder guidelines').",
      ),
  }),
  execute: async (args: {
    module_name: string;
    title?: string;
    subtitle?: string;
  }) => {
    const { module_name } = args;
    const skill = SKILL_REGISTRY.find((s) => s.name === module_name);
    if (!skill) {
      return `Module ${module_name} not found. Available modules: ${SKILL_REGISTRY.map((s) => s.name).join(", ")}`;
    }
    try {
      const content = fs.readFileSync(skill.filePath, "utf-8");
      return content;
    } catch (e: unknown) {
      return `Error reading module ${module_name}: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
