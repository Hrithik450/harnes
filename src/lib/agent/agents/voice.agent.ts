import { z } from "zod";
import { tool, generateObject } from "ai";
import { getUtilityModel } from "@/lib/providers";
import {
  ELEVENLABS_VOICE_CATALOG,
  GOOGLE_VOICE_CATALOG,
  type VoiceProfile,
} from "@/lib/services/voice/voice.catalog";

const VOICE_AGENT_SYSTEM_PROMPT = `You are an expert Voice Casting Director.
Examine the user's natural language voice request for an ad campaign and choose the single best VoiceProfile from the provided catalog based on gender, accent, vocal tone, cadence, timbre, persona, and delivery style.

STRICT CONSTRAINTS:
1. GENDER CONSTRAINT (CRITICAL): You MUST strictly enforce the requested gender.
   - If the query specifies Male (or male/man/guy/boy/baritone/tenor), you MUST choose a voice with "gender": "male". NEVER choose a female voice.
   - If the query specifies Female (or female/woman/girl/soprano/mezzo), you MUST choose a voice with "gender": "female". NEVER choose a male voice.
2. ACCENT MATCHING: If an accent is specified (e.g. American, British, Australian), prioritize voices with that accent.
3. ACOUSTIC MATCHING: Align pitch, timbre, cadence, and musical analogy to the requested sound.
4. Return ONLY an existing voice from the provided catalog and output its exact 'id'.`;

export interface VoiceAgentInput {
  query: string;
  provider?: "elevenlabs" | "google";
}

/**
 * Programmatic helper to cast a voice profile using the Gemini 2.5 Flash utility agent.
 * Matches a simple natural language query string against the active voice catalog with zero overhead.
 */
export async function selectVoiceWithAgent(
  input: VoiceAgentInput,
): Promise<VoiceProfile> {
  const startTime = Date.now();
  const provider =
    input.provider ||
    (process.env.TTS_PROVIDER?.toLowerCase()?.trim() === "google"
      ? "google"
      : "elevenlabs");

  const catalog: VoiceProfile[] =
    provider === "google" ? GOOGLE_VOICE_CATALOG : ELEVENLABS_VOICE_CATALOG;

  const promptQuery = (
    input.query || "Warm, confident, approachable narration"
  ).trim();

  // Detect explicit gender constraints in query
  const isMaleRequested =
    /\b(male|man|guy|men|boy|baritone|tenor)\b/i.test(promptQuery) &&
    !/\b(female|woman|girl|women|soprano|mezzo)\b/i.test(promptQuery);
  const isFemaleRequested =
    /\b(female|woman|girl|women|soprano|mezzo)\b/i.test(promptQuery) &&
    !/\b(male|man|guy|men|boy|baritone|tenor)\b/i.test(promptQuery);

  console.log(
    `[VoiceAgent:Start] Casting voice for provider="${provider}" with query: "${promptQuery}" [requestedGender=${isMaleRequested ? "male" : isFemaleRequested ? "female" : "any"}]`,
  );

  // Invoke Gemini 2.5 Flash Voice Casting Sub-Agent
  try {
    const catalogSummary = catalog.map((v) => ({
      id: v.id,
      name: v.name,
      gender: v.gender,
      accent: v.accent,
      plainSoundDescription: v.plainSoundDescription,
      musicalSound: v.musicalSound,
      bestFor: v.bestFor,
    }));

    const castingPrompt = `Requested Voice:
"${promptQuery}"

Active Provider: ${provider.toUpperCase()}
Available Voice Catalog:
${JSON.stringify(catalogSummary, null, 2)}

Select the optimal matching voice from this catalog.`;

    const result = await generateObject({
      model: getUtilityModel(),
      schema: z.object({
        chosenVoiceId: z
          .string()
          .describe(
            "The exact 'id' of the chosen voice from the provided catalog",
          ),
      }),
      system: VOICE_AGENT_SYSTEM_PROMPT,
      prompt: castingPrompt,
    });

    const chosen = catalog.find(
      (v) =>
        v.id.toLowerCase() === result.object.chosenVoiceId.trim().toLowerCase(),
    );

    if (chosen) {
      // Guard against potential LLM gender hallucination
      const isGenderMismatch =
        (isMaleRequested && chosen.gender !== "male") ||
        (isFemaleRequested && chosen.gender !== "female");

      if (isGenderMismatch) {
        console.warn(
          `[VoiceAgent:GenderMismatch] ⚠️ Model cast "${chosen.name}" (${chosen.gender}) but query requested ${isMaleRequested ? "male" : "female"}. Correcting to matching voice...`,
        );
        const correctGenderVoice = catalog.find((v) =>
          isMaleRequested ? v.gender === "male" : v.gender === "female",
        );
        if (correctGenderVoice) {
          console.log(
            `[VoiceAgent:Success] ✅ Corrected to voice "${correctGenderVoice.name}" (${correctGenderVoice.id}) in ${Date.now() - startTime}ms`,
          );
          return correctGenderVoice;
        }
      }

      console.log(
        `[VoiceAgent:Success] ✅ Cast voice "${chosen.name}" (${chosen.id}) in ${Date.now() - startTime}ms`,
      );
      return chosen;
    }

    console.warn(
      `[VoiceAgent:Warn] Agent returned unrecognized voice ID "${result.object.chosenVoiceId}". Falling back to catalog default.`,
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[VoiceAgent:Error] ❌ Failed to invoke Gemini utility agent after ${Date.now() - startTime}ms: ${msg}. Falling back to default.`,
      err,
    );
  }

  // Fallback: return first voice of matching requested gender
  const fallback =
    (isMaleRequested
      ? catalog.find((v) => v.gender === "male")
      : isFemaleRequested
        ? catalog.find((v) => v.gender === "female")
        : undefined) || catalog[0];

  console.log(
    `[VoiceAgent:Fallback] Using default voice "${fallback.name}" (${fallback.id}) [gender=${fallback.gender}]`,
  );
  return fallback;
}

/**
 * Tool Definition for Voice Casting Sub-Agent.
 * Clean, lightweight tool: accepts a single natural language string query with zero object overhead.
 */
export const voiceAgent = tool({
  description:
    "Voice Casting Sub-Agent: Evaluates a natural language voice query specifying Gender (Male/Female, mandatory), optional Accent (American, British, Australian), and desired acoustic sound/vibe. Selects and returns the optimal VoiceProfile from the active catalog.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Natural language voice query specifying Gender (e.g. 'Gender: Male | Accent: American | Sound: Confident mid-baritone tech founder with punchy delivery'). Gender is mandatory.",
      ),
    provider: z
      .enum(["elevenlabs", "google"])
      .optional()
      .describe(
        "Optional target voice provider: 'elevenlabs' (default) or 'google'.",
      ),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    return await selectVoiceWithAgent({
      query: args.query,
      provider: args.provider,
    });
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
