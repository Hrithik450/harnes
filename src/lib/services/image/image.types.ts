export type AspectRatio = "1:1" | "9:16" | "16:9" | "4:5";
export type ImageFormat = "webp" | "png" | "jpeg";

export type ImageProvider = "openai" | "google";

export interface ImageGenerationRequest {
  id?: string;
  prompt: string;
  aspect_ratio?: AspectRatio;
  format?: ImageFormat;
  storage_path?: string;
  projectId?: string;
}

export interface ImageGenerationResult {
  id: string;
  url: string;
  aspect_ratio: AspectRatio;
  format: ImageFormat;
  status: "success" | "error";
  error?: string;
}

export interface ImageServiceOptions {
  provider?: ImageProvider;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export interface IImageProvider {
  readonly name: ImageProvider;
  generate(params: {
    prompt: string;
    aspectRatio: AspectRatio;
    format: ImageFormat;
    signal?: AbortSignal;
  }): Promise<string>; // Returns base64 encoded image data
}

export interface IImageGeneratorService {
  generateSingle(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResult>;
  generateBatch(
    requests: ImageGenerationRequest[],
  ): Promise<ImageGenerationResult[]>;
}
