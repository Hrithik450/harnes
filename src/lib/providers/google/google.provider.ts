import { createGoogleGenerativeAI } from "@ai-sdk/google";

export interface RoutingProviderOptions {
  /** The sequence of models to try in order */
  models: string[];
  /** Optional label for logging (e.g. "textGeneration") */
  label?: string;
}

// Global map to track model cooldowns on this single key
const globalModelCooldowns = new Map<string, number>();

export function getGoogleApiKey(): string {
  const env = process.env;
  return env.GOOGLE_API_KEY?.trim() || "";
}

/**
 * Creates a provider that routes between models using a single Google API key.
 */
export function createRoutingGoogleProvider(options: RoutingProviderOptions) {
  const modelSequence = options.models;
  const logLabel = options.label ? `:${options.label}` : "";

  const isModelAvailable = (model: string) => {
    const until = globalModelCooldowns.get(model);
    return until == null || Date.now() >= until;
  };

  const markModelCooldown = (model: string, ms: number) => {
    globalModelCooldowns.set(model, Date.now() + ms);
  };

  return createGoogleGenerativeAI({
    apiKey: getGoogleApiKey(),
    fetch: async (originalUrl, fetchOptionsInput) => {
      let lastResponse: Response | undefined;
      let lastError: unknown;
      const activeKey = getGoogleApiKey();

      for (const currentModel of modelSequence) {
        if (!isModelAvailable(currentModel)) {
          continue;
        }

        // Replace model in URL path and ensure activeKey query param is synced
        let urlString = originalUrl
          .toString()
          .replace(/\/models\/([^:]+):/, `/models/${currentModel}:`);

        if (activeKey && urlString.includes("key=")) {
          urlString = urlString.replace(
            /key=[^&]+/,
            `key=${encodeURIComponent(activeKey)}`,
          );
        }

        const headers = new Headers(fetchOptionsInput?.headers);
        if (activeKey) {
          headers.set("x-goog-api-key", activeKey);
        }
        const fetchOptions = { ...fetchOptionsInput, headers };

        try {
          const response = await fetch(urlString, fetchOptions);
          lastResponse = response;

          if (!response.ok) {
            markModelCooldown(currentModel, 60_000);
            if (typeof window === "undefined") {
              console.warn(
                `[Router${logLabel}] HTTP ${response.status} on ${currentModel} -> Falling back to next model`,
              );
            }
            try {
              await response.clone().text();
            } catch {}
            continue;
          }

          // Success
          if (typeof window === "undefined") {
            console.log(`[Model${logLabel}]: used ${currentModel}`);
          }
          return response;
        } catch (error) {
          if (
            (error as Error)?.name === "AbortError" ||
            (error as Error)?.name === "TimeoutError"
          ) {
            throw error;
          }

          lastError = error;
          markModelCooldown(currentModel, 60_000);
          const errStr =
            error instanceof Error ? error.message : "Unknown Error";
          if (typeof window === "undefined") {
            console.warn(
              `[Router${logLabel}] Error on ${currentModel}: ${errStr} -> Falling back to next model`,
            );
          }
          continue;
        }
      }

      if (lastResponse) return lastResponse;
      throw (
        lastError ||
        new Error(`All models failed in sequence: ${modelSequence.join(", ")}`)
      );
    },
  });
}

// 1. Agent Orchestrator Routing (Primary: gemini-3.8-flash -> fallback: gemini-2.5-flash)
export const agentProvider = createRoutingGoogleProvider({
  models: ["gemini-3.8-flash", "gemini-2.5-flash"],
  label: "textGeneration",
});
export const defaultAgentModel = agentProvider("gemini-3.8-flash");

// 2. Thread Title Generation Routing
export const titleProvider = createRoutingGoogleProvider({
  models: ["gemini-2.5-flash"],
  label: "titleGeneration",
});
export const defaultTitleModel = titleProvider("gemini-2.5-flash");

// 3. Utility Routing (Context slicing, voice casting, etc.)
export const utilityProvider = createRoutingGoogleProvider({
  models: ["gemini-2.5-flash"],
  label: "utility",
});
export const defaultUtilityModel = utilityProvider("gemini-2.5-flash");
