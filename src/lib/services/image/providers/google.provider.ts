import { GoogleGenAI } from "@google/genai";
import { retryWithBackoff } from "@/lib/utils/retry";
import type {
  AspectRatio,
  ImageFormat,
  ImageProvider,
  IImageProvider,
} from "../image.types";

export interface GoogleImageProviderOptions {
  apiKey?: string;
  model?: string;
}

/**
 * Google Gemini Image Generation Provider
 *
 * Uses the Google GenAI Interactions API (e.g. gemini-3.1-flash-lite-image)
 * to generate marketing images, posters, and visual creatives.
 */
export class GoogleImageProvider implements IImageProvider {
  public readonly name: ImageProvider = "google";
  private client: GoogleGenAI | null = null;
  private readonly apiKey: string | undefined;
  private readonly model: string;

  public constructor(options?: GoogleImageProviderOptions) {
    this.apiKey =
      options?.apiKey?.trim() ||
      process.env.GEMINI_IMAGE_API_KEY?.trim() ||
      process.env.GOOGLE_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim();

    this.model =
      options?.model?.trim() ||
      process.env.GEMINI_IMAGE_MODEL?.trim() ||
      "gemini-3.1-flash-lite-image";

    if (this.apiKey) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
  }

  /**
   * Generates a single image via Google GenAI Interactions API and returns base64 encoded data.
   */
  public async generate(params: {
    prompt: string;
    aspectRatio: AspectRatio;
    format: ImageFormat;
    signal?: AbortSignal;
  }): Promise<string> {
    if (!this.client) {
      throw new Error(
        "Missing Google Gemini Image credentials. Please set GEMINI_IMAGE_API_KEY or GOOGLE_API_KEY in your environment variables.",
      );
    }

    const { prompt, aspectRatio } = params;
    const formattedPrompt = `[Format & Aspect Ratio: ${aspectRatio}]. ${prompt}`;

    const response = await retryWithBackoff(
      () =>
        this.client!.interactions.create({
          model: this.model,
          input: formattedPrompt,
          response_format: {
            type: "image",
            image_size: "1K",
          },
        }),
      {
        maxRetries: 2,
        initialDelay: 1000,
        shouldRetry: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          return msg.includes("503") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED");
        },
      },
    );

    const generatedImage = response.output_image;
    if (!generatedImage || !generatedImage.data) {
      throw new Error(
        `No image data returned from Google Gemini Image API (${this.model}).`,
      );
    }

    return generatedImage.data;
  }
}
