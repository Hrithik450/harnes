import { createOpenAI } from "@ai-sdk/openai";

/**
 * Validates whether a real OpenAI API key is present and configured.
 */
export function isOpenAiConfigured(): boolean {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return false;
  const trimmed = key.trim();
  if (
    !trimmed ||
    trimmed === "your-openai-api-key-here" ||
    trimmed.startsWith("your-")
  ) {
    return false;
  }
  return true;
}

/**
 * Returns an OpenAI provider instance.
 */
export function getOpenAiProvider() {
  const apiKey = isOpenAiConfigured()
    ? (process.env.OPENAI_API_KEY as string)
    : "unconfigured-key";
  return createOpenAI({
    apiKey,
  });
}

/**
 * Returns an OpenAI model instance for agent execution (defaults to gpt-4o).
 */
export function getOpenAiAgentModel(modelName: string = "gpt-4o") {
  const provider = getOpenAiProvider();
  return provider(modelName);
}
