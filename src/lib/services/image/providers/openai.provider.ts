import type {
  AspectRatio,
  ImageFormat,
  ImageProvider,
  IImageProvider,
} from "../image.types";

export interface OpenAIImageProviderOptions {
  apiKey?: string;
  model?: string;
}

/**
 * OpenAI Image Generation Provider
 *
 * Uses the OpenAI Images API (e.g. gpt-image-2.5-flare, gpt-image-2.5-sunburst, dall-e-3)
 * to generate high-fidelity marketing visuals, ad creatives, and video stills.
 */
export class OpenAIImageProvider implements IImageProvider {
  public readonly name: ImageProvider = "openai";
  private readonly apiKey: string | undefined;
  private readonly model: string;

  public constructor(options?: OpenAIImageProviderOptions) {
    this.apiKey = options?.apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
    const rawModel =
      options?.model?.trim() ||
      process.env.OPENAI_IMAGE_MODEL?.trim() ||
      "gpt-image-2.5-flare";

    // Auto-normalize "gpt-image-2.5" to "gpt-image-2.5-flare"
    this.model =
      rawModel === "gpt-image-2.5" ? "gpt-image-2.5-flare" : rawModel;
  }

  /**
   * Maps aspect ratios to OpenAI supported resolutions.
   */
  private resolveDimensions(aspectRatio: AspectRatio): string {
    switch (aspectRatio) {
      case "9:16":
        return "1024x1792";
      case "16:9":
        return "1792x1024";
      case "4:5":
      case "1:1":
      default:
        return "1024x1024";
    }
  }

  /**
   * Generates a single image via OpenAI Images API and returns base64 encoded data.
   */
  public async generate(params: {
    prompt: string;
    aspectRatio: AspectRatio;
    format: ImageFormat;
    signal?: AbortSignal;
  }): Promise<string> {
    if (!this.apiKey) {
      throw new Error(
        "Missing OpenAI API Key. Please configure OPENAI_API_KEY in your environment variables.",
      );
    }

    const { prompt, aspectRatio, format, signal } = params;
    const formattedPrompt = `[Format & Aspect Ratio: ${aspectRatio}]. ${prompt}`;
    const size = this.resolveDimensions(aspectRatio);
    const outputFormat =
      format === "png" ? "png" : format === "jpeg" ? "jpeg" : "webp";

    const payload: Record<string, unknown> = {
      model: this.model,
      prompt: formattedPrompt,
      n: 1,
      size,
    };

    if (this.model.startsWith("dall-e")) {
      payload.response_format = "b64_json";
    } else {
      payload.output_format = outputFormat;
    }

    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      throw new Error(
        `OpenAI Images API (${this.model}) error (${res.status}): ${errorText}`,
      );
    }

    const data = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };

    // 1. Direct base64 return
    const b64 = data.data?.[0]?.b64_json;
    if (b64) {
      return b64;
    }

    // 2. Direct URL return (fetch and convert to base64)
    const directUrl = data.data?.[0]?.url;
    if (directUrl) {
      const imgRes = await fetch(directUrl, {
        signal: AbortSignal.timeout(30000),
      });
      if (imgRes.ok) {
        const arrBuf = await imgRes.arrayBuffer();
        return Buffer.from(arrBuf).toString("base64");
      }
    }

    throw new Error(
      `OpenAI Images API (${this.model}) did not return any image data or downloadable URL.`,
    );
  }
}
