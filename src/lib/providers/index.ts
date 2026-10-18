import { getOpenAiAgentModel } from "./openai";
import {
  defaultAgentModel as defaultGoogleAgentModel,
  defaultTitleModel as defaultGoogleTitleModel,
  defaultUtilityModel as defaultGoogleUtilityModel,
} from "./google";

export * from "./google";
export * from "./openai";

/**
 * Resolves the agent model for the orchestrator and sub-agents.
 * Defaults to OpenAI gpt-4o via @ai-sdk/openai.
 */
export function getAgentModel() {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase().trim();
  if (provider === "google") {
    return defaultGoogleAgentModel;
  }
  return getOpenAiAgentModel(process.env.OPENAI_MODEL || "gpt-4o");
}

export function getTitleModel() {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase().trim();
  if (provider === "google") {
    return defaultGoogleTitleModel;
  }
  return getOpenAiAgentModel(process.env.OPENAI_MODEL || "gpt-4o");
}

export function getUtilityModel() {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase().trim();
  if (provider === "google") {
    return defaultGoogleUtilityModel;
  }
  return getOpenAiAgentModel(process.env.OPENAI_MODEL || "gpt-4o");
}

export const defaultAgentModel = getAgentModel();

