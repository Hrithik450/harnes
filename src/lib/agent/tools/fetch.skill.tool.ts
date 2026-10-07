import { SKILL_REGISTRY } from "../skills";
import { tool } from "ai";
import { z } from "zod";
import fs from "fs";

export const fetchSkillTool = tool({
  description:
    "Consult the internal knowledge base for detailed instructions and procedures for a specific module or skill. Call this when you need to know how to perform a task.",
  parameters: z.object({
    skill_name: z
      .string()
      .describe("The EXACT name of the module or skill to fetch. Example: 'creative_brief_generator'"),
    title: z
      .string()
      .describe(
        "A short, user-friendly description of your current thought process.",
      ),
    subtitle: z
      .string()
      .describe(
        "A brief explanation of what you are reading in this step.",
      ),
  }),
  execute: async (args: {
    skill_name: string;
    title?: string;
    subtitle?: string;
  }) => {
    const { skill_name } = args;
    console.log(`\n🤖 [AI Tool Called] -> fetch_skill: Reading guidelines for '${skill_name}'`);
    
    const skill = SKILL_REGISTRY.find((s) => s.name === skill_name);
    if (!skill) {
      console.warn(`⚠️ [AI Tool Error] -> Skill '${skill_name}' not found.`);
      return `Skill ${skill_name} not found. Available skills: ${SKILL_REGISTRY.map((s) => s.name).join(", ")}`;
    }
    try {
      const content = fs.readFileSync(skill.filePath, "utf-8");
      return content;
    } catch (e: unknown) {
      console.error(`❌ [AI Tool Error] -> Failed to read '${skill_name}':`, e);
      return `Error reading skill ${skill_name}: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
