import { z } from "zod";
import { tool } from "ai";
import {
  ImageGenerationService,
  type ImageGenerationRequest,
  type ImageGenerationResult,
} from "@/lib/services";
import type { ImageAssetGroup } from "@/lib/types/asset.types";

export const generateImagesTool = tool({
  description:
    "Generate marketing images, ad creatives, flyers, or video anchor stills using the configured image provider (OpenAI or Google Gemini via IMAGE_PROVIDER). Supports custom aspect ratios ('1:1' for square posters/flyers, '9:16' for vertical video/Reels, '16:9' for landscape, '4:5' for feeds) and format selection ('webp' for posters/WhatsApp, 'png' for video stills). Returns permanent public Cloudflare R2 URLs.",
  inputSchema: z.object({
    storage_path: z
      .string()
      .optional()
      .describe(
        "Destination folder path under harness/assets/ (e.g. 'marketing-tool' for posters/flyers/banners, 'videos/proj_summer_01/shots' for vertical video anchor stills, 'ecommerce/products' for catalogs). Defaults to 'marketing-tool'.",
      ),
    images: z
      .array(
        z.object({
          id: z
            .string()
            .optional()
            .describe(
              "Optional shot or creative identifier, e.g. 'S01', 'creative_variant_A'",
            ),
          prompt: z
            .string()
            .describe(
              "Detailed visual prompt including style, composition, subject, lighting, and negative filters",
            ),
          aspect_ratio: z
            .enum(["1:1", "9:16", "16:9", "4:5"])
            .default("1:1")
            .describe(
              "Aspect ratio: '9:16' for vertical video/Reels/WhatsApp Status, '1:1' for square posters/flyers, '16:9' for horizontal banners, '4:5' for vertical feed ads",
            ),
          format: z
            .enum(["webp", "png", "jpeg"])
            .default("webp")
            .describe(
              "Output format: 'webp' for posters, flyers, and WhatsApp status (default); 'png' for lossless video anchor stills.",
            ),
        }),
      )
      .min(1)
      .max(15)
      .describe("Array of image requests to generate concurrently."),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    const toolStart = Date.now();
    if (
      !args.images ||
      args.images.length === 0 ||
      !Array.isArray(args.images)
    ) {
      console.warn(
        "[Tool:generate_images:ValidationError] ⚠️ Empty or invalid images array provided.",
      );
      return "Error: You must provide an array of at least one image request in 'images'.";
    }

    // Safety clamp: up to 15 images
    const targetImages = args.images.slice(0, 15);
    if (args.images.length > 15) {
      console.warn(
        `[Tool:generate_images:SafetyClamp] ⚠️ Capped requested images from ${args.images.length} to 15.`,
      );
    }

    console.log(
      `[Tool:generate_images:Start] Generating ${targetImages.length} image(s) in folder "${args.storage_path || "marketing-tool"}"`,
    );

    targetImages.forEach((img: (typeof targetImages)[number], idx: number) => {
      console.log(
        `  -> [#${idx + 1}] id=${img.id || "auto"} | aspect=${img.aspect_ratio || "1:1"} | format=${img.format || "webp"} | prompt="${(img.prompt || "").slice(0, 90)}..."`,
      );
    });

    try {
      const imageService = ImageGenerationService.getInstance();
      const batchRequests: ImageGenerationRequest[] = targetImages.map(
        (img: Omit<ImageGenerationRequest, "storage_path">) => ({
          ...img,
          storage_path: args.storage_path || "marketing-tool",
        }),
      );
      const results: ImageGenerationResult[] =
        await imageService.generateBatch(batchRequests);

      const successCount = results.filter(
        (r: ImageGenerationResult) => r.status === "success",
      ).length;
      const failures = results.filter(
        (r: ImageGenerationResult) => r.status === "error",
      );

      console.log(
        `[Tool:generate_images:Complete] Finished in ${Date.now() - toolStart}ms | Succeeded: ${successCount}/${results.length} | Failed: ${failures.length}`,
      );

      if (failures.length > 0) {
        console.warn(
          `[Tool:generate_images:Failures] ⚠️ Failed images:`,
          failures.map((f) => ({ id: f.id, error: f.error })),
        );
      }

      const responsePayload = {
        total: results.length,
        successCount: successCount,
        failedCount: failures.length,
        images: results.map((r: ImageGenerationResult) => ({
          id: r.id,
          url: r.url,
          aspect_ratio: r.aspect_ratio,
          format: r.format,
          status: r.status,
          ...(r.error ? { error: r.error } : {}),
        })),
      };

      let summaryText = `Successfully generated ${successCount}/${results.length} images in parallel:\n`;
      results.forEach((r: ImageGenerationResult) => {
        if (r.status === "success") {
          summaryText += `- **${r.id}** (${r.aspect_ratio}, ${r.format}): ${r.url}\n`;
        } else {
          summaryText += `- ⚠️ **${r.id}** (${r.aspect_ratio}): Failed (${r.error})\n`;
        }
      });

      summaryText += `\nRaw Data:\n\`\`\`json\n${JSON.stringify(responsePayload, null, 2)}\n\`\`\``;

      const successfulImages = results.filter(
        (r: ImageGenerationResult) => r.status === "success" && r.url,
      );
      if (successfulImages.length > 0) {
        const imageAsset: ImageAssetGroup = {
          type: "image",
          variants: successfulImages.map((r: ImageGenerationResult) => ({
            id: r.id || "variant",
            aspect_ratio:
              (r.aspect_ratio as "1:1" | "9:16" | "16:9" | "4:5") || "1:1",
            image: {
              url: r.url,
              format: r.format || "webp",
            },
            created_at: new Date().toISOString(),
          })),
        };
        summaryText += `\n<!-- ASSET_METADATA: ${JSON.stringify(imageAsset)} -->`;
      }

      return summaryText;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[Tool:generate_images:Error] ❌ Exception after ${Date.now() - toolStart}ms: ${message}`,
        err,
      );
      return `Error: ${message}`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
