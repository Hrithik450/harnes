import { z } from "zod";
import { tool } from "ai";
import { FfmpegRenderService } from "@/lib/services";
import type { VideoAssetGroup } from "@/lib/types/asset.types";

export const retryVideoRenderTool = tool({
  description:
    "Retry or re-render video stitching/assembly for an existing project using its plan.json from Cloudflare R2. Call this tool when video clips and voiceover are already generated but the FFmpeg assembly step failed or needs to be re-run. Re-retrieves plan.json from R2 and dispatches directly to the hardware FFmpeg server with 0 duplicate image or clip generation costs.",
  inputSchema: z.object({
    project_id: z
      .string()
      .describe(
        "The project identifier (e.g. 'proj_summer_ad' or 'test_decoupled_flow') whose plan.json and clips should be re-rendered.",
      ),
    title: z
      .string()
      .optional()
      .describe("Optional campaign title for output display"),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    const toolStart = Date.now();
    const projectId = String(args.project_id || "").trim();
    if (!projectId) {
      return "Error: You must provide a valid 'project_id' to retry rendering.";
    }

    const title = args.title || "Video Ad (Re-stitched)";

    console.log(
      `[Tool:retry_video_render:Start] Retrying render for project="${projectId}"`,
    );

    try {
      const ffmpegService = FfmpegRenderService.getInstance();
      const renderResult = await ffmpegService.retryRender(projectId);

      console.log(
        `[Tool:retry_video_render:Complete] Re-render succeeded in ${Date.now() - toolStart}ms`,
      );

      let markdown = `### 🎬 Video Ad Re-stitched: ${title}\n\n`;
      markdown += `![${title}](${renderResult.videoUrl})\n\n`;
      markdown += `**Re-stitch Deliverables**:\n`;
      markdown += `- **Master Ad (1080×1920 with Audio)**: [View MP4](${renderResult.videoUrl})\n`;
      if (renderResult.planUrl) {
        markdown += `- **Retrieved Assembly Plan**: [View plan.json](${renderResult.planUrl})\n`;
      }
      markdown += `- **Render Engine**: Apple Silicon Hardware VideoToolbox (${renderResult.renderTimeSeconds}s @ ${renderResult.fps} fps via ${renderResult.encoderUsed})\n`;
      markdown += `\n*Zero duplicate generation: Stitched instantly from Cloudflare R2 assets with zero cost.*`;

      const assetMetadata: VideoAssetGroup = {
        type: "video",
        project_id: projectId,
        aspect_ratio: "9:16",
        format: "mp4",
        shots: [],
        plan: renderResult.planUrl
          ? {
              url: renderResult.planUrl,
              format: "json",
            }
          : undefined,
        master_video: {
          url: renderResult.videoUrl,
          format: "mp4",
        },
        created_at: new Date().toISOString(),
      };
      markdown += `\n<!-- ASSET_METADATA: ${JSON.stringify(assetMetadata)} -->`;

      return markdown;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Tool:retry_video_render:Error] Failed to retry render for "${projectId}":`,
        err,
      );
      return `Error retrying video render for project "${projectId}": ${msg}`;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
