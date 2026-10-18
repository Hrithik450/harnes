import {
  uploadMediaToR2,
  uploadJsonToR2,
  getJsonFromR2,
  listAssetsFromR2,
} from "@/lib/storage/r2";
import { retryWithBackoff } from "@/lib/utils/retry";

export interface RenderTrackSpec {
  shot_id: string;
  url: string;
  trim_in?: number;
  duration?: number;
  timeline_start?: number;
  timeline_end?: number;
}

export interface RenderAudioSpec {
  voiceover_url?: string;
  music_url?: string;
  music_ducking_db?: number;
  target_lufs?: number;
  true_peak_dbfs?: number;
}

export interface RenderOverlaySpec {
  persistent_offer?: {
    url?: string;
    y_pos?: number;
    start_s?: number;
    end_s?: number;
  };
  subtitles?: string;
  end_card?: {
    url?: string;
    start_s?: number;
    duration_s?: number;
  };
}

export interface RenderPlanRequest {
  canvas?: {
    width?: number;
    height?: number;
    fps?: number;
    duration_s?: number;
  };
  video_tracks: RenderTrackSpec[];
  audio?: RenderAudioSpec;
  overlays?: RenderOverlaySpec;
}

export interface FfmpegRenderResult {
  success: boolean;
  jobId: string;
  videoUrl: string;
  rawRenderUrl: string;
  filename: string;
  renderTimeSeconds: number;
  fps: number;
  encoderUsed: string;
  planUrl?: string;
}

export class FfmpegRenderService {
  private static instance: FfmpegRenderService | null = null;
  private readonly defaultServerUrl: string;

  private constructor() {
    this.defaultServerUrl =
      process.env.FFMPEG_SERVER_URL?.replace(/\/+$/, "") ||
      "http://127.0.0.1:3001";
  }

  public static getInstance(): FfmpegRenderService {
    if (!FfmpegRenderService.instance) {
      FfmpegRenderService.instance = new FfmpegRenderService();
    }
    return FfmpegRenderService.instance;
  }

  public getServerUrl(): string {
    return (
      process.env.FFMPEG_SERVER_URL?.replace(/\/+$/, "") ||
      this.defaultServerUrl
    );
  }

  /**
   * Health-check the FFmpeg render server
   */
  public async checkHealth(): Promise<{
    online: boolean;
    videoCodec?: string;
    isAppleSilicon?: boolean;
    error?: string;
  }> {
    const serverUrl = this.getServerUrl();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${serverUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        return {
          online: false,
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }
      const data = await res.json();
      return {
        online: data.status === "online",
        videoCodec: data.videoCodec,
        isAppleSilicon: data.isAppleSilicon,
      };
    } catch (err) {
      return {
        online: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Dispatches the render plan to the hardware-accelerated Apple Silicon FFmpeg server,
   * waits for completion, downloads the stitched MP4, and uploads to permanent Cloudflare R2 storage.
   */
  public async renderVideo(
    plan: RenderPlanRequest,
    projectId: string = "video_ad",
  ): Promise<FfmpegRenderResult> {
    const serverUrl = this.getServerUrl();
    const renderStart = Date.now();
    const cleanProjectId = projectId
      .replace(/^videos\//, "")
      .replace(/\/+$/, "");

    console.log(
      `[FfmpegRenderService:renderVideo:Start] Server="${serverUrl}", Project="${cleanProjectId}", Shots=${plan.video_tracks.length}, HasVoiceover=${Boolean(plan.audio?.voiceover_url)}`,
    );

    // Persist plan.json to Cloudflare R2 so stitching can ALWAYS be retried deterministically
    let planUrl: string | undefined;
    try {
      planUrl = await uploadJsonToR2(
        plan,
        "plan.json",
        `videos/${cleanProjectId}`,
      );
      console.log(
        `[FfmpegRenderService:PlanPersist:Success] ✅ Persisted plan.json to Cloudflare R2: ${planUrl}`,
      );
    } catch (planErr) {
      console.warn(
        `[FfmpegRenderService:PlanPersist:Warning] Could not persist plan.json to R2:`,
        planErr,
      );
    }

    const RENDER_TIMEOUT_MS = 180000; // 180s (3 min) max duration for complex stitches & hardware rendering

    const serverResponse = await retryWithBackoff(
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), RENDER_TIMEOUT_MS);

        try {
          const res = await fetch(`${serverUrl}/render`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(plan),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (!res.ok) {
            const errorText = await res.text().catch(() => "");
            let detail = errorText;
            try {
              const parsed = JSON.parse(errorText);
              detail = parsed.details || parsed.error || errorText;
            } catch {
              // Non-JSON response
            }
            throw new Error(
              `FFmpeg render server error (${res.status}): ${detail || res.statusText}`,
            );
          }

          const json = await res.json();
          if (!json.success || !json.videoUrl) {
            throw new Error(
              json.details || json.error || "FFmpeg render server reported failure.",
            );
          }
          return json as {
            success: boolean;
            jobId: string;
            videoUrl: string;
            filename: string;
            renderTimeSeconds: number;
            fps: number;
            encoderUsed: string;
            error?: string;
            details?: string;
          };
        } catch (fetchErr) {
          clearTimeout(timeout);
          console.error(
            "[FfmpegRenderService:renderVideo:AttemptError]",
            fetchErr,
          );
          throw fetchErr;
        }
      },
      {
        maxRetries: 2,
        initialDelay: 1500,
        shouldRetry: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          return (
            msg.includes("502") ||
            msg.includes("503") ||
            msg.includes("504") ||
            msg.includes("ECONNRESET") ||
            msg.includes("ETIMEDOUT")
          );
        },
      },
    );

    console.log(
      `[FfmpegRenderService:renderVideo:Done] ✅ Hardware render completed in ${serverResponse.renderTimeSeconds}s (${serverResponse.fps} fps, elapsed ${Date.now() - renderStart}ms) via ${serverResponse.encoderUsed}. Server output: ${serverResponse.videoUrl}`,
    );

    // Download the rendered MP4 and upload to permanent Cloudflare R2 CDN (with retry)
    let finalVideoUrl = serverResponse.videoUrl;
    try {
      console.log(
        `[FfmpegRenderService:R2Persist:Start] Fetching rendered video from ${serverResponse.videoUrl} to persist to Cloudflare R2...`,
      );
      const vidRes = await retryWithBackoff(
        async () => {
          const res = await fetch(serverResponse.videoUrl, {
            signal: AbortSignal.timeout(120000), // 120s timeout for downloading rendered master MP4 over Cloudflare tunnel
          });
          if (!res.ok) {
            throw new Error(
              `Failed to fetch rendered MP4 (${res.status}): ${res.statusText}`,
            );
          }
          return res;
        },
        { maxRetries: 3, initialDelay: 1500 },
      );

      const buffer = Buffer.from(await vidRes.arrayBuffer());
      const r2Url = await uploadMediaToR2(
        buffer,
        `master_${serverResponse.filename}`,
        "video/mp4",
        `videos/${cleanProjectId}/final`,
      );
      finalVideoUrl = r2Url;
      console.log(
        `[FfmpegRenderService:R2Persist:Success] ✅ Persisted master video to Cloudflare R2: ${finalVideoUrl}`,
      );
    } catch (r2Err) {
      console.warn(
        `[FfmpegRenderService:R2Persist:Fallback] Could not persist to R2; falling back to direct server video URL:`,
        r2Err,
      );
    }

    return {
      success: true,
      jobId: serverResponse.jobId,
      videoUrl: finalVideoUrl,
      rawRenderUrl: serverResponse.videoUrl,
      filename: serverResponse.filename,
      renderTimeSeconds: serverResponse.renderTimeSeconds,
      fps: serverResponse.fps,
      encoderUsed: serverResponse.encoderUsed,
      planUrl,
    };
  }

  /**
   * Re-retrieves plan.json from Cloudflare R2 for a project and dispatches it
   * straight to the FFmpeg render server, avoiding any duplicate clip or image generation.
   */
  public async retryRender(projectId: string): Promise<FfmpegRenderResult> {
    const cleanProjectId = projectId
      .replace(/^videos\//, "")
      .replace(/\/+$/, "");
    console.log(
      `[FfmpegRenderService:retryRender:Start] Attempting retry render for project="${cleanProjectId}"...`,
    );

    // 1. Attempt to fetch stored plan.json from R2
    const storedPlan = await getJsonFromR2<RenderPlanRequest>(
      `videos/${cleanProjectId}/plan.json`,
    );

    if (
      storedPlan &&
      storedPlan.video_tracks &&
      storedPlan.video_tracks.length > 0
    ) {
      console.log(
        `[FfmpegRenderService:retryRender:FoundPlan] ✅ Retrieved plan.json from R2 with ${storedPlan.video_tracks.length} track(s). Dispatching to FFmpeg server...`,
      );
      return this.renderVideo(storedPlan, cleanProjectId);
    }

    // 2. Fallback: If plan.json was not yet stored, inspect R2 for existing clips and audio to reconstruct plan
    console.log(
      `[FfmpegRenderService:retryRender:Reconstruct] plan.json not found in R2 for "${cleanProjectId}". Inspecting project folder to reconstruct plan...`,
    );
    const assets = await listAssetsFromR2(`videos/${cleanProjectId}`);
    const clips = assets.filter(
      (a) => a.assetType === "video" && !a.key.includes("/final/"),
    );
    const audios = assets.filter((a) => a.assetType === "audio");

    if (clips.length === 0) {
      throw new Error(
        `Cannot retry render for project "${cleanProjectId}": No plan.json or video clips found in R2 storage under videos/${cleanProjectId}/.`,
      );
    }

    const reconstructedPlan: RenderPlanRequest = {
      canvas: { width: 1080, height: 1920, fps: 30 },
      video_tracks: clips.map((c, i) => ({
        shot_id: `S${String(i + 1).padStart(2, "0")}`,
        url: c.publicUrl,
        trim_in: 0,
        duration: 4,
      })),
      audio:
        audios.length > 0 ? { voiceover_url: audios[0].publicUrl } : undefined,
    };

    console.log(
      `[FfmpegRenderService:retryRender:Reconstructed] Reconstructed plan with ${reconstructedPlan.video_tracks.length} clips and ${audios.length > 0 ? "1 audio track" : "no audio"}. Dispatching to FFmpeg...`,
    );
    return this.renderVideo(reconstructedPlan, cleanProjectId);
  }
}
