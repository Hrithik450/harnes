import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { getGoogleApiKeyPool } from "./api-key-pool";

export const googleProvider = createGoogleGenerativeAI({
  apiKey: "ROTATING_KEY",
  fetch: async (url, options) => {
    const pool = getGoogleApiKeyPool();
    const maxAttempts = Math.max(1, pool.size);
    const tried = new Set<string>();
    let lastResponse: Response | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const apiKey = pool.acquire(tried);
      tried.add(apiKey);

      const headers = new Headers(options?.headers);
      headers.set("x-goog-api-key", apiKey);

      const fetchOptions = { ...options, headers };

      const response = await fetch(url, fetchOptions);
      lastResponse = response;

      if (response.status === 429) {
        pool.markRateLimited(apiKey);
        console.warn(
          `[gemini-api-keys] Key ${pool.label(
            apiKey,
          )} hit 429 rate limit. Rotating...`,
        );

        // Consume response body to free socket/memory before next fetch
        try {
          await response.text();
        } catch {}

        continue;
      }

      return response;
    }

    return lastResponse!;
  },
});
