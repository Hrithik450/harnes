import { SKILL_REGISTRY } from "../skills";
import { tool } from "ai";
import { z } from "zod";
import fs from "fs";
import path from "path";

export const fetchSkillTool = tool({
  description:
    "Consult the internal knowledge base for detailed instructions and procedures for a specific skill. Call this when you need to know how to perform a task.",
  inputSchema: z.object({
    skill_name: z
      .string()
      .describe(
        "The EXACT name of the skill to fetch (e.g., 'creative_brief_generator').",
      ),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    const rawName = String(
      args?.skill_name || args?.name || args?.skill || args?.skillName || "",
    ).trim().toLowerCase();
    const startTime = Date.now();
    console.log(`[Tool:fetch_skill:Start] Fetching guidelines for skill="${rawName}"...`);

    const skill = SKILL_REGISTRY.find((s) => s.name.toLowerCase() === rawName);
    if (!skill) {
      console.warn(
        `[Tool:fetch_skill:NotFound] ⚠️ Skill '${rawName}' not in registry. Available: ${SKILL_REGISTRY.map((s) => s.name).join(", ")}`,
      );
      return `Skill '${rawName}' not found. Available skills: ${SKILL_REGISTRY.map((s) => s.name).join(", ")}`;
    }
    try {
      let resolvedPath = skill.filePath;
      if (!fs.existsSync(resolvedPath)) {
        const basename = path.basename(skill.filePath);
        const candidates = [
          path.join(process.cwd(), "src/lib/agent/skills", basename),
          path.join(process.cwd(), ".next/server/src/lib/agent/skills", basename),
          path.resolve(__dirname, "../../skills", basename),
          path.resolve(__dirname, "../skills", basename),
        ];
        const match = candidates.find((c) => fs.existsSync(c));
        if (match) {
          resolvedPath = match;
        }
      }

      const content = fs.readFileSync(resolvedPath, "utf-8");
      console.log(
        `[Tool:fetch_skill:Success] ✅ Loaded skill "${skill.name}" (${content.length} chars) from ${resolvedPath} in ${Date.now() - startTime}ms`,
      );
      return content;
    } catch (e: unknown) {
      console.error(
        `[Tool:fetch_skill:Error] ❌ Failed to read skill file "${skill.filePath}" for "${skill.name}":`,
        e,
      );
      return `Error reading skill ${skill.name}: ${e instanceof Error ? e.message : String(e)}`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
