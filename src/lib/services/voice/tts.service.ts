import { uploadMediaToR2 } from "@/lib/storage/r2";
import { selectVoiceWithAgent } from "@/lib/agent/agents";
import type {
  TtsProvider,
  TtsRequest,
  TtsResult,
  TtsServiceOptions,
  ITtsProvider,
} from "./tts.types";
import { ElevenLabsTtsProvider } from "./providers/elevenlabs.provider";
import { GoogleTtsProvider } from "./providers/google.provider";
import {
  ELEVENLABS_VOICE_CATALOG,
  GOOGLE_VOICE_CATALOG,
  type VoiceProfile,
} from "./voice.catalog";

// Re-export types and providers for clean external consumption
export * from "./tts.types";
export * from "./providers";

/**
 * Text-to-Speech (TTS) Service
 *
 * Orchestrates voiceover narration across strictly configured providers (ElevenLabs or Google),
 * uploads generated audio assets to Cloudflare R2, and returns permanent public URLs.
 *
 * Features:
 * - Strict Provider Selection: Uses either ElevenLabs or Google based on `TTS_PROVIDER`
 *   (or constructor option). No automatic fallback.
 * - Modular Provider Architecture: Provider-specific logic is isolated into dedicated modules.
 * - Dynamic Voice Casting: Casts the optimal voice profile using the Voice Casting Sub-Agent.
 * - Singleton Pattern: Shared instance across application calls.
 */
export class TtsService {
  private static instance: TtsService | null = null;
  private readonly provider: ITtsProvider;
  private readonly timeoutMs: number;

  public constructor(options?: TtsServiceOptions) {
    this.timeoutMs = options?.timeoutMs ?? 30000;

    // Resolve provider strictly: "elevenlabs" or "google" (default: "elevenlabs")
    const requested = options?.provider || process.env.TTS_PROVIDER || "elevenlabs";
    const normalized = requested.toLowerCase().trim();

    const selectedProvider: TtsProvider =
      normalized === "google" ? "google" : "elevenlabs";

    if (selectedProvider === "google") {
      this.provider = new GoogleTtsProvider({
        apiKey: options?.apiKey,
      });
    } else {
      this.provider = new ElevenLabsTtsProvider({
        apiKey: options?.apiKey || options?.elevenLabsApiKey,
      });
    }
  }

  /**
   * Singleton accessor ensuring a single shared instance across the application lifecycle.
   */
  public static getInstance(options?: TtsServiceOptions): TtsService {
    if (!TtsService.instance) {
      TtsService.instance = new TtsService(options);
    }
    return TtsService.instance;
  }

  /**
   * Reset instance (primarily for testing or dynamic configuration reload).
   */
  public static resetInstance(): void {
    TtsService.instance = null;
  }

  /**
   * Returns the name of the active TTS provider ("elevenlabs" | "google").
   */
  public get activeProvider(): TtsProvider {
    return this.provider.name;
  }

  /**
   * Synthesize voiceover audio using strictly the configured provider (no fallback)
   * and upload directly to Cloudflare R2.
   */
  public async synthesize(request: TtsRequest): Promise<TtsResult> {
    const startTime = Date.now();
    const folder =
      request.folder ||
      (request.projectId
        ? `videos/${request.projectId}/audio`
        : "videos/audio");
    const filename =
      request.filename ||
      `voiceover-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.mp3`;
    const soundQuery = request.soundDescription || request.persona;

    const catalog: VoiceProfile[] =
      this.provider.name === "google"
        ? GOOGLE_VOICE_CATALOG
        : ELEVENLABS_VOICE_CATALOG;

    // Resolve voice profile: direct match from catalog if voiceId was provided, otherwise cast via sub-agent
    let activeProfile: VoiceProfile | undefined = request.voiceId
      ? catalog.find(
          (v) =>
            v.id.toLowerCase() === request.voiceId?.trim().toLowerCase() ||
            v.name.toLowerCase() === request.voiceId?.trim().toLowerCase(),
        )
      : undefined;

    if (!activeProfile) {
      if (soundQuery) {
        activeProfile = await selectVoiceWithAgent({
          query: soundQuery,
          provider: this.provider.name,
        });
      } else {
        activeProfile = catalog[0];
      }
    }

    const voiceId = activeProfile.id;
    const voiceName = activeProfile.name;
    const soundDescription = activeProfile.plainSoundDescription;

    console.log(
      `[TtsService:Start] [provider=${this.provider.name}] Synthesizing "${request.script.slice(0, 80)}..." using voice "${voiceName}" (${voiceId}) based on sound: "${soundQuery || "balanced acoustic"}" [${soundDescription}]`,
    );

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

    try {
      const genStart = Date.now();

      // Call strictly the configured provider - NO FALLBACK
      const audioBuffer = await this.provider.generate({
        script: request.script,
        voice: activeProfile,
        signal: abortController.signal,
      });

      console.log(
        `[TtsService:Generated] [provider=${this.provider.name}] Generated audio with voice "${voiceName}" in ${Date.now() - genStart}ms (${(audioBuffer.length / 1024).toFixed(1)}KB)`,
      );

      const uploadStart = Date.now();
      const publicUrl = await uploadMediaToR2(
        audioBuffer,
        filename,
        "audio/mpeg",
        folder,
      );

      console.log(
        `[TtsService:Uploaded] [provider=${this.provider.name}] R2 upload finished in ${Date.now() - uploadStart}ms -> ${publicUrl}`,
      );

      return {
        url: publicUrl,
        provider: this.provider.name,
        voiceId,
        voiceName,
        soundDescription,
        status: "success",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[TtsService:Error] [provider=${this.provider.name}] ❌ Failed to synthesize audio after ${Date.now() - startTime}ms: ${message}`,
      );
      return {
        url: "",
        provider: this.provider.name,
        voiceId,
        voiceName,
        soundDescription,
        status: "error",
        error: message,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
