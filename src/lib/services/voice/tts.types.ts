import type { VoiceProfile } from "./voice.catalog";

export type TtsProvider = "elevenlabs" | "google";

export interface TtsRequest {
  script: string;
  soundDescription?: string; // Musical & acoustic sound description, e.g. "warm acoustic mezzo", "deep baritone rumble"
  persona?: string; // Legacy/persona description, e.g. "30-year-old woman"
  voiceId?: string; // Optional explicit voice ID or name override
  folder?: string;
  projectId?: string;
  filename?: string;
}

export interface TtsResult {
  url: string;
  provider: TtsProvider;
  voiceId: string;
  voiceName: string;
  soundDescription: string;
  status: "success" | "error";
  error?: string;
}

export interface TtsServiceOptions {
  provider?: TtsProvider;
  apiKey?: string;
  elevenLabsApiKey?: string;
  timeoutMs?: number;
}

export interface ITtsProvider {
  readonly name: TtsProvider;
  generate(params: {
    script: string;
    voice: VoiceProfile;
    signal?: AbortSignal;
  }): Promise<Buffer>;
}
