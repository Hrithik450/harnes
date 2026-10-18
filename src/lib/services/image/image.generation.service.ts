import { uploadImageToR2 } from "@/lib/storage/r2";
import { retryWithBackoff } from "@/lib/utils/retry";
import type {
  AspectRatio,
  ImageFormat,
  ImageGenerationRequest,
  ImageGenerationResult,
  ImageProvider,
  ImageServiceOptions,
  IImageGeneratorService,
  IImageProvider,
} from "./image.types";
import { OpenAIImageProvider } from "./providers/openai.provider";
import { GoogleImageProvider } from "./providers/google.provider";

// Re-export types and providers for clean external consumption
export * from "./image.types";
export * from "./providers";

/**
 * Image Generation Service
 *
 * Orchestrates image generation across strictly configured providers (OpenAI or Google),
 * uploads generated assets to Cloudflare R2, and returns permanent public URLs.
 *
 * Features:
 * - Strict Provider Selection: Uses either Google or OpenAI based on `IMAGE_PROVIDER`
 *   (or constructor option). No automatic fallback.
 * - Modular Provider Architecture: Provider-specific logic is isolated into dedicated modules.
 * - Singleton Pattern: Shared instance across application calls.
 * - Parallel Batch Execution: Concurrently processes multiple image generation requests.
 */
export class ImageGenerationService implements IImageGeneratorService {
  private static instance: ImageGenerationService | null = null;
  private readonly provider: IImageProvider;
  private readonly timeoutMs: number;

  public constructor(options?: ImageServiceOptions) {
    this.timeoutMs = options?.timeoutMs ?? 45000;

    // Resolve provider strictly: "google" or "openai" (default: "openai")
    const requested = options?.provider || process.env.IMAGE_PROVIDER || "openai";
    const normalized = requested.toLowerCase().trim();

    const selectedProvider: ImageProvider =
      normalized === "google" || normalized === "gemini" ? "google" : "openai";

    if (selectedProvider === "google") {
      this.provider = new GoogleImageProvider({
        apiKey: options?.apiKey,
        model: options?.model,
      });
    } else {
      this.provider = new OpenAIImageProvider({
        apiKey: options?.apiKey,
        model: options?.model,
      });
    }
  }

  /**
   * Singleton accessor ensuring a single shared instance across the application lifecycle.
   */
  public static getInstance(
    options?: ImageServiceOptions,
  ): ImageGenerationService {
    if (!ImageGenerationService.instance) {
      ImageGenerationService.instance = new ImageGenerationService(options);
    }
    return ImageGenerationService.instance;
  }

  /**
   * Reset instance (primarily for testing or dynamic configuration reload).
   */
  public static resetInstance(): void {
    ImageGenerationService.instance = null;
  }

  /**
   * Returns the name of the active image generation provider ("openai" | "google").
   */
  public get activeProvider(): ImageProvider {
    return this.provider.name;
  }

  /**
   * Uploads generated base64 image data to Cloudflare R2 storage in the requested format
   * and designated namespaced folder.
   */
  private async uploadToStorage(
    base64Data: string,
    id: string,
    format: ImageFormat,
    storagePath?: string,
    projectId?: string,
  ): Promise<string> {
    const sanitizedId = id.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const sanitizedProject = projectId
      ? `${projectId.toLowerCase().replace(/[^a-z0-9]/g, "-")}-`
      : "";
    const ext = format === "png" ? "png" : format === "jpeg" ? "jpg" : "webp";
    const filename = `asset-${sanitizedProject}${sanitizedId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const targetFolder =
      storagePath?.trim() ||
      (projectId ? `videos/${projectId}/shots` : "marketing-tool");

    return retryWithBackoff(
      () => uploadImageToR2(base64Data, filename, format, targetFolder),
      {
        maxRetries: 3,
        shouldRetry: (error) => {
          if (
            error instanceof Error &&
            error.message.includes("Missing R2 configuration")
          ) {
            return false;
          }
          return true;
        },
      },
    );
  }

  /**
   * Generate a single image asset using strictly the configured provider (no fallback).
   */
  public async generateSingle(
    request: ImageGenerationRequest,
  ): Promise<ImageGenerationResult> {
    const id = request.id || "img_1";
    const aspectRatio: AspectRatio = request.aspect_ratio || "1:1";
    const format: ImageFormat = request.format || "webp";
    const singleStart = Date.now();

    console.log(
      `[ImageService:Single:Start] [id=${id}] [provider=${this.provider.name}] aspect=${aspectRatio}, format=${format}, prompt="${request.prompt.slice(0, 100)}..."`,
    );

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.timeoutMs);

    try {
      const genStart = Date.now();

      // Call strictly the configured provider - NO FALLBACK
      const base64Data = await this.provider.generate({
        prompt: request.prompt,
        aspectRatio,
        format,
        signal: abortController.signal,
      });

      console.log(
        `[ImageService:Single:Generated] [id=${id}] [provider=${this.provider.name}] Generated in ${Date.now() - genStart}ms (${(base64Data.length / 1024).toFixed(1)}KB base64)`,
      );

      const uploadStart = Date.now();
      const publicUrl = await this.uploadToStorage(
        base64Data,
        id,
        format,
        request.storage_path,
        request.projectId,
      );

      console.log(
        `[ImageService:Single:Uploaded] [id=${id}] R2 upload finished in ${Date.now() - uploadStart}ms -> ${publicUrl}`,
      );

      return {
        id,
        url: publicUrl,
        aspect_ratio: aspectRatio,
        format,
        status: "success",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[ImageService:Single:Error] [id=${id}] [provider=${this.provider.name}] ❌ Failed after ${Date.now() - singleStart}ms: ${message}`,
      );
      return {
        id,
        url: "",
        aspect_ratio: aspectRatio,
        format,
        status: "error",
        error: message,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Generate a batch of image assets concurrently in parallel using the configured provider.
   */
  public async generateBatch(
    requests: ImageGenerationRequest[],
  ): Promise<ImageGenerationResult[]> {
    const batchStart = Date.now();
    console.log(
      `[ImageService:Batch:Start] [provider=${this.provider.name}] Generating batch of ${requests.length} image(s) in parallel...`,
    );

    const results = await Promise.all(
      requests.map((request, idx) =>
        this.generateSingle({
          id: request.id || `img_${idx + 1}`,
          prompt: request.prompt,
          aspect_ratio: request.aspect_ratio || "1:1",
          format: request.format || "webp",
          storage_path: request.storage_path,
          projectId: request.projectId,
        }),
      ),
    );

    const successCount = results.filter((r) => r.status === "success").length;
    console.log(
      `[ImageService:Batch:Complete] [provider=${this.provider.name}] ${successCount}/${results.length} succeeded in ${Date.now() - batchStart}ms`,
    );

    return results;
  }
}
