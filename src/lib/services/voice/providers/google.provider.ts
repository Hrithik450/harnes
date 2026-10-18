import type { ITtsProvider, TtsProvider } from "../tts.types";
import type { VoiceProfile } from "../voice.catalog";
import { retryWithBackoff } from "@/lib/utils/retry";

export interface GoogleTtsProviderOptions {
  apiKey?: string;
}

/**
 * Google Cloud Text-to-Speech Provider
 *
 * Calls the Google Cloud Text-to-Speech REST API (v1 synthesize)
 * to synthesize high-clarity voiceover based on the matched Google / Journey voice.
 */
export class GoogleTtsProvider implements ITtsProvider {
  public readonly name: TtsProvider = "google";
  private readonly apiKey?: string;

  public constructor(options?: GoogleTtsProviderOptions) {
    this.apiKey =
      options?.apiKey?.trim() ||
      process.env.GOOGLE_TTS_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim();
  }

  public async generate(params: {
    script: string;
    voice: VoiceProfile;
    signal?: AbortSignal;
  }): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error(
        "Missing Google TTS credentials. Please configure GOOGLE_TTS_API_KEY or GOOGLE_API_KEY in your environment variables.",
      );
    }

    const { script, voice, signal } = params;
    const endpoint = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.apiKey}`;
    const voiceName = voice.id.startsWith("en-") ? voice.id : "en-US-Journey-F";
    const langCode =
      voice.languageCode || (voice.accent === "British" ? "en-GB" : "en-US");

    const res = await retryWithBackoff(
      async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: script },
            voice: {
              languageCode: langCode,
              name: voiceName,
              ssmlGender: voice.gender === "female" ? "FEMALE" : "MALE",
            },
            audioConfig: { audioEncoding: "MP3" },
          }),
          signal,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          throw new Error(
            `Google Text-to-Speech API error (${response.status}): ${errText}`,
          );
        }
        return response;
      },
      {
        maxRetries: 2,
        initialDelay: 500,
        shouldRetry: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          return msg.includes("500") || msg.includes("503") || msg.includes("429");
        },
      },
    );

    const json = (await res.json()) as { audioContent?: string };
    if (!json.audioContent) {
      throw new Error(
        "No audioContent returned from Google Text-to-Speech API.",
      );
    }

    return Buffer.from(json.audioContent, "base64");
  }
}
