import { uploadMediaToR2 } from "@/lib/storage/r2";

export interface SeedanceTaskResponse {
  id: string;
  status: "queued" | "running" | "succeeded" | "failed" | "cancelled";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: any;
}

export interface VideoClipRequest {
  motion_prompt: string;
  image_url: string;
  projectId: string;
  shotId: string;
  duration?: number;
  folder?: string;
}

export interface VideoClipResult {
  url: string;
  duration_sec: number;
  status: "success" | "error";
  error?: string;
}

/**
 * Service for BytePlus ModelArk SeaDance Video Generation.
 * - Submits asynchronous video generation tasks (POST /contents/generations/tasks)
 * - Polls for completion (GET /contents/generations/tasks/{id})
 * - Transfers finished video to Cloudflare R2 for permanent streaming
 */
export class SeedanceService {
  private static instance: SeedanceService | null = null;
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly model: string;

  public constructor(options?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }) {
    this.apiKey =
      options?.apiKey?.trim() ||
      process.env.BYTEPLUS_API_KEY?.trim() ||
      process.env.SEEDANCE_API_KEY?.trim();

    const rawBaseUrl =
      options?.baseUrl?.trim() ||
      process.env.BYTEPLUS_BASE_URL?.trim() ||
      "https://ark.ap-southeast.bytepluses.com/api/v3";
    this.baseUrl = rawBaseUrl.replace(/\/+$/, "");

    // Default to Seedance 1.5 Pro (guaranteed active on account)
    this.model =
      options?.model?.trim() ||
      process.env.BYTEPLUS_VIDEO_MODEL?.trim() ||
      "seedance-1-5-pro-251215";
  }

  public static getInstance(options?: {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
  }): SeedanceService {
    if (!SeedanceService.instance) {
      SeedanceService.instance = new SeedanceService(options);
    }
    return SeedanceService.instance;
  }

  public static resetInstance(): void {
    SeedanceService.instance = null;
  }

  /**
   * Submit and generate a video clip using BytePlus ModelArk SeaDance.
   */
  public async generateClip(
    request: VideoClipRequest,
  ): Promise<VideoClipResult> {
    const startTime = Date.now();

    const shotId = request.shotId;
    const projectId = request.projectId;

    if (!shotId || !projectId) {
      throw new Error(
        `Both shotId and projectId must be provided for video generation (received shotId="${shotId}", projectId="${projectId}").`,
      );
    }

    if (!request.image_url) {
      throw new Error(
        `image_url must be provided for shot "${shotId}". Seedance only supports image-to-video motion generation, not text-to-video.`,
      );
    }

    const imageUrl = request.image_url;

    // BytePlus seedance-1-5-pro API supports durations: 4s, 5s, 6s, 10s. Default to 4s if unspecified.
    const duration =
      request.duration && [4, 5, 6, 10].includes(request.duration)
        ? request.duration
        : 4;

    console.log(
      `[SeedanceService:Start] [shot=${shotId}] Generating ${duration}s video clip via BytePlus ModelArk (${this.model})...`,
    );

    if (!this.apiKey) {
      console.error(
        "[SeedanceService:ConfigError] Missing BYTEPLUS_API_KEY / SEEDANCE_API_KEY in environment.",
      );
      throw new Error(
        "Missing BytePlus ModelArk API key. Please set BYTEPLUS_API_KEY in your .env file.",
      );
    }

    const taskEndpoint = `${this.baseUrl}/contents/generations/tasks`;
    console.log(
      `[SeedanceService:SubmitTask] Calling ${taskEndpoint} (Model: ${this.model})...`,
    );

    const submitRes = await fetch(taskEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        content: [
          {
            type: "text",
            text: request.motion_prompt.trim(),
          },
          {
            type: "image_url",
            image_url: { url: imageUrl },
            role: "first_frame",
          },
        ],
        ratio: "9:16",
        resolution: "480p",
        duration,
        generate_audio: false,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => "");
      throw new Error(
        `BytePlus SeaDance API submission failed (${submitRes.status}): ${errText}`,
      );
    }

    const submitJson = (await submitRes.json()) as {
      id?: string;
      task_id?: string;
    };
    const taskId = submitJson.id || submitJson.task_id;

    if (!taskId) {
      throw new Error("BytePlus SeaDance API did not return a task ID.");
    }

    console.log(
      `[SeedanceService:TaskQueued] [shot=${shotId}] Task ID: ${taskId}. Polling for completion...`,
    );

    // 2. Poll for task completion (GET /contents/generations/tasks/{id})
    const pollEndpoint = `${taskEndpoint}/${taskId}`;
    const MAX_WAIT_MS = 120000;
    const POLL_INTERVAL_MS = 2500;
    const pollStart = Date.now();
    let videoUrl = "";

    while (Date.now() - pollStart < MAX_WAIT_MS) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      let pollJson: SeedanceTaskResponse | null = null;
      try {
        const pollRes = await fetch(pollEndpoint, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
          signal: AbortSignal.timeout(10000), // 10s timeout per poll
        });

        if (!pollRes.ok) {
          console.warn(
            `[SeedanceService:PollWarn] Poll attempt returned HTTP status ${pollRes.status}`,
          );
          continue;
        }

        pollJson = (await pollRes.json()) as SeedanceTaskResponse;
      } catch (pollNetErr) {
        console.warn(
          `[SeedanceService:PollNetWarn] Transient network issue while polling task ${taskId} (${Date.now() - pollStart}ms):`,
          pollNetErr instanceof Error ? pollNetErr.message : pollNetErr,
        );
        continue;
      }

      const status = pollJson?.status;
      console.log(
        `[SeedanceService:PollStatus] [shot=${shotId}] Task ${taskId} is currently: "${status}" (${Date.now() - pollStart}ms)`,
      );

      if (status === "succeeded") {
        const contentItem = Array.isArray(pollJson.content)
          ? pollJson.content[0]
          : pollJson.content || pollJson.result;
        videoUrl =
          contentItem?.video_url ||
          contentItem?.url ||
          (typeof contentItem === "string" ? contentItem : "");
        break;
      } else if (status === "failed" || status === "cancelled") {
        const errorMsg =
          typeof pollJson.error === "object"
            ? JSON.stringify(pollJson.error)
            : String(pollJson.error || "Video rendering failed");
        throw new Error(`SeaDance rendering ${status}: ${errorMsg}`);
      }
    }

    if (!videoUrl) {
      throw new Error(
        `SeaDance generation timed out after ${MAX_WAIT_MS / 1000}s without completion.`,
      );
    }

    console.log(
      `[SeedanceService:RenderComplete] [shot=${shotId}] Video rendered by SeaDance: ${videoUrl}`,
    );

    // 3. Download video and transfer to Cloudflare R2 for permanent access
    console.log(
      `[SeedanceService:R2Transfer] Downloading video to persist in R2...`,
    );
    const vidDownloadRes = await fetch(videoUrl, {
      signal: AbortSignal.timeout(90000), // 90s timeout for downloading video clip from SeaDance
    });
    if (!vidDownloadRes.ok) {
      throw new Error(
        `Failed to fetch generated video from SeaDance URL (${vidDownloadRes.status})`,
      );
    }

    const vidBuffer = Buffer.from(await vidDownloadRes.arrayBuffer());
    const folder = request.folder || `videos/${projectId}/clips`;
    const filename = `clip-${shotId.toLowerCase()}-${Date.now()}.mp4`;

    const publicUrl = await uploadMediaToR2(
      vidBuffer,
      filename,
      "video/mp4",
      folder,
    );

    console.log(
      `[SeedanceService:Success] [shot=${shotId}] ✅ Video saved to R2 in ${Date.now() - startTime}ms -> ${publicUrl}`,
    );

    return {
      status: "success",
      url: publicUrl,
      duration_sec: duration,
    };
  }
}
