import type { ITtsProvider, TtsProvider } from "../tts.types";
import type { VoiceProfile } from "../voice.catalog";
import { retryWithBackoff } from "@/lib/utils/retry";

export interface ElevenLabsTtsProviderOptions {
  apiKey?: string;
  modelId?: string;
}

/**
 * ElevenLabs Text-to-Speech Provider
 *
 * Calls ElevenLabs REST API (eleven_multilingual_v2) to synthesize
 * studio-grade voice narration based on the matched voice profile.
 */
export class ElevenLabsTtsProvider implements ITtsProvider {
  public readonly name: TtsProvider = "elevenlabs";
  private readonly apiKey?: string;
  private readonly modelId: string;

  public constructor(options?: ElevenLabsTtsProviderOptions) {
    this.apiKey = options?.apiKey?.trim() || process.env.ELEVENLABS_API_KEY?.trim();
    this.modelId =
      options?.modelId?.trim() ||
      process.env.ELEVENLABS_MODEL_ID?.trim() ||
      "eleven_multilingual_v2";
  }

  public async generate(params: {
    script: string;
    voice: VoiceProfile;
    signal?: AbortSignal;
  }): Promise<Buffer> {
    if (!this.apiKey) {
      throw new Error(
        "Missing ElevenLabs API Key. Please configure ELEVENLABS_API_KEY in your environment variables.",
      );
    }

    const { script, voice, signal } = params;
    const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}`;

    const res = await retryWithBackoff(
      async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "xi-api-key": this.apiKey!,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: script,
            model_id: this.modelId,
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
          signal,
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => "");
          throw new Error(`ElevenLabs API error (${response.status}): ${errText}`);
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

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
