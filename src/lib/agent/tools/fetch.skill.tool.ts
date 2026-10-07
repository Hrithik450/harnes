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
      .optional()
      .describe(
        "A short, user-friendly description of your current thought process.",
      ),
    subtitle: z
      .string()
      .optional()
      .describe(
        "A brief explanation of what you are reading in this step.",
      ),
  }),
  execute: async (args: any) => {
    // Extremely forgiving argument extraction for the LLM
    let skill_name = args.skill_name || args.module_name || args.name || args.skill;
    
    // If it STILL sent an empty object {}, we'll have to return an error asking it to provide the parameter
    if (!skill_name && Object.keys(args).length === 0) {
      console.warn(`⚠️ [AI Tool Error] -> fetch_skill called with empty arguments!`);
      return `CRITICAL ERROR: You MUST provide the 'skill_name' parameter. For example: {"skill_name": "creative_brief_generator"}. Available skills: ${SKILL_REGISTRY.map((s) => s.name).join(", ")}`;
    }

    // If it somehow passed it as the first value of an unknown key
    if (!skill_name && Object.values(args).length > 0) {
      skill_name = Object.values(args)[0];
    }

    console.log(`\n🤖 [AI Tool Called] -> fetch_skill: Reading guidelines for '${skill_name}'`);
    
    const skill = SKILL_REGISTRY.find((s) => s.name === skill_name);
    if (!skill) {
      console.warn(`⚠️ [AI Tool Error] -> Skill '${skill_name}' not found.`);
      return `Skill '${skill_name}' not found. Available skills: ${SKILL_REGISTRY.map((s) => s.name).join(", ")}`;
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
