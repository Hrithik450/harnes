import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getGoogleApiKeyPool } from "./api-key-pool";

export const googleProvider = createGoogleGenerativeAI({
  apiKey: "ROTATING_KEY",
  fetch: async (originalUrl, options) => {
    const pool = getGoogleApiKeyPool();
    const maxKeyAttempts = Math.max(1, pool.size);
    const triedKeys = new Set<string>();
    let lastResponse: Response | undefined;
    let lastError: unknown;

    const MODEL_SEQUENCE = [
      "gemini-2.5-flash",
      "gemini-3.5-flash",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
    ];

    // Model-specific cooldowns map: `${apiKey}::${model}` -> timestamp
    const modelCooldowns = new Map<string, number>();

    const isModelAvailable = (apiKey: string, model: string) => {
      const until = modelCooldowns.get(`${apiKey}::${model}`);
      return until == null || Date.now() >= until;
    };

    const markModelCooldown = (apiKey: string, model: string, ms: number) => {
      modelCooldowns.set(`${apiKey}::${model}`, Date.now() + ms);
    };

    for (let keyAttempt = 0; keyAttempt < maxKeyAttempts; keyAttempt++) {
      const apiKey = pool.acquire(triedKeys);
      triedKeys.add(apiKey);

      const headers = new Headers(options?.headers);
      headers.set("x-goog-api-key", apiKey);
      const fetchOptions = { ...options, headers };

      let keyFailedCompletely = true;

      for (const currentModel of MODEL_SEQUENCE) {
        if (!isModelAvailable(apiKey, currentModel)) {
          continue; // skip this model on this key if it's cooling down
        }

        // Replace the model name in the requested URL
        const urlString = originalUrl.toString();
        const modifiedUrl = urlString.replace(
          /\/models\/([^:]+):/,
          `/models/${currentModel}:`,
        );

        try {
          const response = await fetch(modifiedUrl, fetchOptions);
          lastResponse = response;

          if (!response.ok) {
            markModelCooldown(apiKey, currentModel, 60_000);
            console.warn(
              `[Router] Cause: HTTP ${response.status} | Switched: Model | Cooldown: 60s for ${currentModel} on ${pool.label(apiKey)}`,
            );

            try {
              await response.text();
            } catch {}

            continue; // move to next model in sequence
          }

          // Success!
          keyFailedCompletely = false;
          return response;
        } catch (error) {
          lastError = error;
          markModelCooldown(apiKey, currentModel, 60_000);
          const errStr =
            error instanceof Error ? error.message : "Unknown Error";
          console.warn(
            `[Router] Cause: ${errStr} | Switched: Model | Cooldown: 60s for ${currentModel} on ${pool.label(apiKey)}`,
          );
          continue; // move to next model in sequence
        }
      }

      if (keyFailedCompletely) {
        // All models threw an error or were skipped. Cool down the entire API key for 90s.
        pool.markRateLimited(apiKey, 90_000);
        console.warn(
          `[Router] Cause: All models failed | Switched: API Key | Cooldown: 90s for entire ${pool.label(apiKey)}`,
        );
      }
    }

    if (lastResponse) return lastResponse;
    throw lastError || new Error("All models and API keys failed.");
  },
});
