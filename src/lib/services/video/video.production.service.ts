import {
  ImageGenerationService,
  type ImageGenerationRequest,
} from "../image/image.generation.service";

export const MAX_VIDEO_SHOTS = 15;

export interface VideoShotSpec {
  id: string; // e.g. "S01", "S02"
  prompt: string; // Visual prompt for the 9:16 vertical anchor still
  motion_prompt: string; // Motion prompt for video model (e.g. "slow cinematic push-in")
  duration_sec: number; // Cut duration in seconds (1.5 - 3.0s)
  aspect_ratio?: "9:16";
  image_url?: string; // Optional cached/existing PNG URL
  video_clip_url?: string; // Optional cached/existing MP4 clip URL
}

export interface VideoVoiceoverSpec {
  script: string;
  pace_wpm?: number;
  audio_url?: string; // Optional cached audio URL
}

export interface VideoOfferBadgeSpec {
  headline: string;
  subtext?: string;
  disclaimer?: string;
}

export interface VideoPlanSpec {
  title: string;
  project_id?: string;
  shots: VideoShotSpec[];
  voiceover: VideoVoiceoverSpec;
  offer_badge?: VideoOfferBadgeSpec;
}

export interface VideoProductionStats {
  total_shots: number;
  images_reused: number;
  images_generated: number;
  clips_reused: number;
  clips_generated: number;
  audio_reused: boolean;
  audio_generated: boolean;
}

export interface VideoProductionResult {
  project_id: string;
  title: string;
  status: "prepared" | "rendered" | "error";
  shots: Array<VideoShotSpec & { image_url: string; video_clip_url?: string }>;
  voiceover: VideoVoiceoverSpec & { audio_url?: string };
  offer_badge?: VideoOfferBadgeSpec;
  final_video_url?: string;
  stats: VideoProductionStats;
  message: string;
}

export class VideoProductionService {
  private static instance: VideoProductionService | null = null;
  private readonly imageService: ImageGenerationService;
  private readonly ffmpegServerUrl: string;

  public constructor(options?: {
    imageService?: ImageGenerationService;
    ffmpegServerUrl?: string;
  }) {
    this.imageService =
      options?.imageService ?? ImageGenerationService.getInstance();
    this.ffmpegServerUrl =
      options?.ffmpegServerUrl ??
      process.env.FFMPEG_SERVER_URL ??
      "http://localhost:3001";
  }

  public static getInstance(options?: {
    imageService?: ImageGenerationService;
    ffmpegServerUrl?: string;
  }): VideoProductionService {
    if (!VideoProductionService.instance) {
      VideoProductionService.instance = new VideoProductionService(options);
    }
    return VideoProductionService.instance;
  }

  public static resetInstance(): void {
    VideoProductionService.instance = null;
  }

  public async processPlan(
    plan: VideoPlanSpec,
  ): Promise<VideoProductionResult> {
    const planStart = Date.now();
    const projectId =
      plan.project_id ||
      `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    console.log(
      `[VideoService:processPlan:Start] Processing plan="${plan.title}", project="${projectId}", shots=${plan.shots?.length || 0}`,
    );

    // 1. Strict Max 15 Shots Cap
    if (!plan.shots || !Array.isArray(plan.shots) || plan.shots.length === 0) {
      console.error("[VideoService:processPlan:ValidationError] ❌ Empty or invalid shots array.");
      throw new Error(
        "Invalid video plan: Must provide an array of at least 1 shot.",
      );
    }

    if (plan.shots.length > MAX_VIDEO_SHOTS) {
      console.error(
        `[VideoService:processPlan:ValidationError] ❌ Plan exceeds max cap: ${plan.shots.length} > ${MAX_VIDEO_SHOTS}`,
      );
      throw new Error(
        `Video plan exceeds maximum cap: Received ${plan.shots.length} shots, but maximum allowed is ${MAX_VIDEO_SHOTS} shots.`,
      );
    }

    const targetShots = plan.shots.slice(0, MAX_VIDEO_SHOTS);

    const stats: VideoProductionStats = {
      total_shots: targetShots.length,
      images_reused: 0,
      images_generated: 0,
      clips_reused: 0,
      clips_generated: 0,
      audio_reused: false,
      audio_generated: false,
    };

    // 2. Identify missing anchor stills (Smart Delta / Cache)
    const shotsToGenerateImages: ImageGenerationRequest[] = [];
    const shotMap = new Map<string, VideoShotSpec>();

    targetShots.forEach((shot, idx) => {
      const shotId = shot.id || `S${String(idx + 1).padStart(2, "0")}`;
      const normalizedShot: VideoShotSpec = {
        ...shot,
        id: shotId,
        aspect_ratio: "9:16", // Always 9:16 vertical
      };
      shotMap.set(shotId, normalizedShot);

      if (shot.image_url && shot.image_url.trim().length > 0) {
        // Cached asset hit! Skip generation
        stats.images_reused++;
      } else {
        // Needs generation: ALWAYS original lossless PNG for video stills
        shotsToGenerateImages.push({
          id: shotId,
          prompt: shot.prompt,
          aspect_ratio: "9:16",
          format: "png", // STRICT: Always PNG for video generation
          storage_path: `videos/${projectId}/shots`,
          projectId,
        });
      }
    });

    console.log(
      `[VideoService:processPlan:CacheAudit] Reused ${stats.images_reused} cached stills, generating ${shotsToGenerateImages.length} missing stills`,
    );

    // 3. Generate missing anchor stills in parallel using ImageGenerationService
    if (shotsToGenerateImages.length > 0) {
      console.log(
        `[VideoService:processPlan:StillsStart] Generating ${shotsToGenerateImages.length} anchor stills in parallel...`,
      );
      const generatedResults = await this.imageService.generateBatch(
        shotsToGenerateImages,
      );
      stats.images_generated = generatedResults.filter(
        (r) => r.status === "success",
      ).length;

      for (const res of generatedResults) {
        const shot = shotMap.get(res.id);
        if (shot && res.status === "success" && res.url) {
          shot.image_url = res.url;
        }
      }
      console.log(
        `[VideoService:processPlan:StillsComplete] Stills generated: ${stats.images_generated}/${shotsToGenerateImages.length}`,
      );
    }

    // 4. Check Motion Video Clips (Smart Delta / Cache)
    targetShots.forEach((shot) => {
      if (shot.video_clip_url && shot.video_clip_url.trim().length > 0) {
        stats.clips_reused++;
      }
    });

    // 5. Check Voiceover Audio (Smart Delta / Cache)
    const voiceoverResult = { ...plan.voiceover };
    if (
      voiceoverResult.audio_url &&
      voiceoverResult.audio_url.trim().length > 0
    ) {
      stats.audio_reused = true;
    }

    const finalizedShots = Array.from(shotMap.values()).map((s) => ({
      ...s,
      image_url: s.image_url || "",
    }));

    console.log(
      `[VideoService:processPlan:Complete] ✅ Video plan prepared in ${Date.now() - planStart}ms | shots=${finalizedShots.length}, generated=${stats.images_generated}, reused=${stats.images_reused}`,
    );

    return {
      project_id: projectId,
      title: plan.title,
      status: "prepared",
      shots: finalizedShots,
      voiceover: voiceoverResult,
      offer_badge: plan.offer_badge,
      stats,
      message:
        stats.images_reused > 0
          ? `Incremental Update: Reused ${stats.images_reused} cached stills and generated ${stats.images_generated} new PNG stills (capped at max 15).`
          : `Fresh Render: Generated all ${stats.images_generated} PNG stills in parallel (capped at max 15).`,
    };
  }
}
