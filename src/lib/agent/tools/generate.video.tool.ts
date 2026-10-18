import { z } from "zod";
import { tool } from "ai";
import {
  ImageGenerationService,
  SeedanceService,
  TtsService,
  FfmpegRenderService,
} from "@/lib/services";
import type { VideoAssetGroup } from "@/lib/types/asset.types";

export const generateVideoTool = tool({
  description:
    "Generate a 9:16 vertical video ad. For multi-shot video ads (e.g. 3, 4, or more shots), pass the 'shots' array with anchor still image_urls generated concurrently via generate_images. Arguments: { title: string, project_id?: string, shots?: Array<{ id?: string, image_url: string, motion_prompt: string, duration_sec?: number }>, image_url?: string, motion_prompt?: string, voiceover_script?: string, voice_id?: string, offer_headline?: string }. Uses BytePlus ModelArk SeaDance for motion video, ElevenLabs/Google for voiceover narration, and hardware FFmpeg for assembly. Returns a playable video preview and Cloudflare R2 URLs.",
  inputSchema: z.object({
    title: z.string().describe("Title or campaign name of the video ad"),
    project_id: z
      .string()
      .optional()
      .describe("Optional project namespace, e.g. 'proj_summer_ad'"),
    shots: z
      .array(
        z.object({
          id: z.string().optional(),
          image_url: z
            .string()
            .optional()
            .describe(
              "URL of the pre-generated 9:16 vertical anchor still image from generate_images.",
            ),
          motion_prompt: z
            .string()
            .describe(
              "Camera and subject motion prompt for Seedance video model (e.g. 'smooth cinematic push-in, natural motion, articulate lip movements').",
            ),
          duration_sec: z.number().optional().default(4),
        }),
      )
      .optional()
      .describe(
        "Recommended for multi-shot videos: Array of shots (e.g. 4 shots for a 15-second ad). Each shot specifies an anchor still image_url from generate_images, motion_prompt, and duration_sec.",
      ),
    image_url: z
      .string()
      .optional()
      .describe(
        "For single-shot ads or primary anchor still: 9:16 anchor still PNG URL from Cloudflare R2 (generated via generate_images).",
      ),
    prompt: z
      .string()
      .optional()
      .describe(
        "Visual prompt for the opening 9:16 anchor still frame. Used to generate the still image if image_url is omitted.",
      ),
    motion_prompt: z
      .string()
      .optional()
      .describe(
        "Camera and subject motion prompt for SeaDance video model (required if 'shots' is not provided).",
      ),
    voiceover_script: z
      .string()
      .optional()
      .describe(
        "Voiceover script for TTS narration (e.g. 15-30s spoken script).",
      ),
    voice_id: z
      .string()
      .optional()
      .describe(
        "The voice ID or name to synthesize the voiceover with, as cast by voice_agent (e.g. 'pNInz6obpgDQGcFmaJgB' or 'Adam').",
      ),
    offer_headline: z
      .string()
      .optional()
      .describe(
        "Optional offer badge or call to action, e.g. '50% Off First Visit'",
      ),
    retry_render_only: z
      .boolean()
      .optional()
      .describe(
        "Optional: Set to true to re-stitch/assemble the video using existing plan.json from Cloudflare R2 without regenerating any stills or video clips.",
      ),
  }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  execute: async (args: any) => {
    const toolStart = Date.now();
    const projectId =
      args.project_id ||
      `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const title = args.title || "Video Ad";

    // Fast-path: Direct retry render from existing plan.json in R2
    if (args.retry_render_only && args.project_id) {
      console.log(
        `[Tool:generate_video:FastPathRetry] Retrying render directly from R2 plan for project="${args.project_id}"`,
      );
      const ffmpegService = FfmpegRenderService.getInstance();
      const res = await ffmpegService.retryRender(args.project_id);
      let md = `### 🎬 Video Ad Re-stitched: ${title}\n\n`;
      md += `![${title}](${res.videoUrl})\n\n`;
      md += `**Re-stitch Deliverables**:\n`;
      md += `- **Master Ad**: [View MP4](${res.videoUrl})\n`;
      if (res.planUrl) {
        md += `- **Assembly Plan**: [View plan.json](${res.planUrl})\n`;
      }
      md += `- **Render Engine**: Apple Silicon Hardware VideoToolbox (${res.renderTimeSeconds}s @ ${res.fps} fps via ${res.encoderUsed})\n`;

      const assetMetadata: VideoAssetGroup = {
        type: "video",
        project_id: args.project_id,
        aspect_ratio: "9:16",
        format: "mp4",
        shots: [],
        plan: res.planUrl
          ? {
              url: res.planUrl,
              format: "json",
            }
          : undefined,
        master_video: {
          url: res.videoUrl,
          format: "mp4",
        },
        created_at: new Date().toISOString(),
      };
      md += `\n<!-- ASSET_METADATA: ${JSON.stringify(assetMetadata)} -->`;
      return md;
    }

    const MAX_SHOTS = 15;
    const DEFAULT_DURATION_SEC = 4;

    // Check for pre-existing or approved anchor still image
    let anchorStillUrl =
      (args.image_url && String(args.image_url).trim()) ||
      (args.shots && args.shots.length > 0 && args.shots[0].image_url
        ? String(args.shots[0].image_url).trim()
        : "");
    let audioUrl = "";

    let primaryPrompt = args.prompt;
    const primaryMotionPrompt =
      args.shots && args.shots.length > 0
        ? args.shots[0].motion_prompt
        : args.motion_prompt;

    console.log(
      `[Tool:generate_video:Start] Title="${title}", Project="${projectId}", PreExistingImage=${Boolean(anchorStillUrl)}`,
    );

    try {
      // Step 1: Resolve 9:16 vertical anchor still (prefer decoupled pre-generated still)
      if (anchorStillUrl) {
        try {
          const parsed = new URL(anchorStillUrl);
          if (
            parsed.hostname.includes("example.") ||
            parsed.hostname === "localhost" ||
            parsed.pathname.includes("placeholder") ||
            parsed.pathname.includes("unique-image")
          ) {
            console.warn(
              `[Tool:generate_video:Step1:PlaceholderDetected] Ignoring placeholder image_url "${anchorStillUrl}". Falling back to still generation.`,
            );
            anchorStillUrl = undefined;
          }
        } catch {
          console.warn(
            `[Tool:generate_video:Step1:InvalidUrl] Ignoring invalid image_url "${anchorStillUrl}". Falling back to still generation.`,
          );
          anchorStillUrl = undefined;
        }
      }

      if (anchorStillUrl) {
        console.log(
          `[Tool:generate_video:Step1:Reused] ⚡ Reusing pre-generated anchor still (skipping image generation): ${anchorStillUrl}`,
        );
      } else {
        if (!primaryPrompt) {
          primaryPrompt =
            args.motion_prompt ||
            `${title}, 9:16 vertical commercial video still, professional lighting, cinematic detail`;
          console.log(
            `[Tool:generate_video:Step1:DerivedPrompt] No prompt or image_url provided. Derived prompt from motion_prompt: "${primaryPrompt}"`,
          );
        }
        console.log(
          `[Tool:generate_video:Step1:Fallback] Generating 9:16 anchor still via ImageService...`,
        );
        const imageService = ImageGenerationService.getInstance();
        const stillResult = await imageService.generateSingle({
          id: "S01",
          prompt: primaryPrompt,
          aspect_ratio: "9:16",
          format: "png",
          storage_path: `videos/${projectId}/shots`,
          projectId,
        });

        if (stillResult.status !== "success" || !stillResult.url) {
          throw new Error(
            `Failed to generate anchor still: ${stillResult.error || "Unknown error"}`,
          );
        }
        anchorStillUrl = stillResult.url;
        console.log(
          `[Tool:generate_video:Step1:Success] Anchor still generated: ${anchorStillUrl}`,
        );
      }

      // Step 2: Voiceover Narration via Studio TTS (ElevenLabs / Google) FIRST
      let voiceDetails = "";
      if (args.voiceover_script && args.voiceover_script.trim().length > 0) {
        console.log(
          `[Tool:generate_video:Step2] Generating voiceover via TTS with cast voice_id="${args.voice_id || "default"}"...`,
        );
        const ttsService = TtsService.getInstance();
        const ttsResult = await ttsService.synthesize({
          script: args.voiceover_script,
          voiceId: args.voice_id,
          projectId,
          folder: `videos/${projectId}/audio`,
        });
        if (ttsResult.status === "success" && ttsResult.url) {
          audioUrl = ttsResult.url;
          voiceDetails = `${ttsResult.voiceName} (${ttsResult.voiceId})`;
          console.log(
            `[Tool:generate_video:Step2:Success] Voiceover generated: ${audioUrl} [Voice: ${voiceDetails}]`,
          );
        } else {
          console.warn(
            `[Tool:generate_video:Step2:Warning] Voiceover generation failed: ${ttsResult.error || "Unknown error"}. Proceeding with silent video assembly.`,
          );
        }
      }

      // Step 3: Resolve shots and generate motion clips with BytePlus Seedance (up to TEST_CLIP_COUNT)
      const targetShots: Array<{
        id: string;
        image_url: string;
        motion_prompt: string;
        duration_sec: number;
      }> = [];

      if (args.shots && args.shots.length > 0) {
        const slice = args.shots.slice(0, MAX_SHOTS);
        for (let i = 0; i < slice.length; i++) {
          const s = slice[i];
          let shotImg =
            (s.image_url && String(s.image_url).trim()) || anchorStillUrl;
          if (
            shotImg &&
            (shotImg.includes("example.") ||
              shotImg.includes("placeholder") ||
              shotImg.includes("unique-image"))
          ) {
            shotImg = anchorStillUrl;
          }
          if (!shotImg) {
            throw new Error(
              `Shot ${s.id || `S0${i + 1}`} is missing an image_url. SeaDance requires an image for each shot.`,
            );
          }
          targetShots.push({
            id: s.id || `S0${i + 1}`,
            image_url: shotImg,
            motion_prompt:
              s.motion_prompt ||
              primaryMotionPrompt ||
              "Cinematic camera movement, natural dynamic motion",
            duration_sec: s.duration_sec || DEFAULT_DURATION_SEC,
          });
        }
      } else {
        if (!anchorStillUrl) {
          throw new Error(
            "Missing image_url: SeaDance requires an anchor still image for video generation.",
          );
        }
        targetShots.push({
          id: "S01",
          image_url: anchorStillUrl,
          motion_prompt:
            primaryMotionPrompt ||
            "Cinematic camera movement, natural dynamic motion",
          duration_sec: DEFAULT_DURATION_SEC,
        });
      }

      console.log(
        `[Tool:generate_video:Step3] Generating ${targetShots.length} motion clip(s) via Seedance...`,
      );
      const seedanceService = SeedanceService.getInstance();
      const cleanScript = (args.voiceover_script || "")
        .trim()
        .replace(/^["']|["']$/g, "");

      const generatedClips = await Promise.all(
        targetShots.map(async (shot, idx) => {
          let prompt = shot.motion_prompt;
          // Inject dialogue into the first shot if script is present
          if (
            cleanScript &&
            idx === 0 &&
            !prompt.includes(`"${cleanScript}"`)
          ) {
            prompt = `${prompt}. Speaking to the camera: "${cleanScript}"`;
          }

          console.log(
            `[Tool:generate_video:Step3:Shot] Generating shot ${shot.id} via Seedance (Prompt: "${prompt}")...`,
          );
          const clip = await seedanceService.generateClip({
            motion_prompt: prompt,
            image_url: shot.image_url,
            projectId,
            shotId: shot.id,
            duration: shot.duration_sec,
            folder: `videos/${projectId}/clips`,
          });
          return {
            shotId: shot.id,
            imageUrl: shot.image_url,
            url: clip.url,
            duration: shot.duration_sec,
          };
        }),
      );

      console.log(
        `[Tool:generate_video:Step3:Success] Successfully generated ${generatedClips.length} Seedance clip(s).`,
      );

      // Step 4: Hardware-Accelerated Video & Audio Assembly via FFmpeg Server
      console.log(
        `[Tool:generate_video:Step4] Stitching ${generatedClips.length} video clip(s) & voiceover with FFmpeg Render Server...`,
      );
      const ffmpegService = FfmpegRenderService.getInstance();
      const renderResult = await ffmpegService.renderVideo(
        {
          canvas: { width: 1080, height: 1920, fps: 30 },
          video_tracks: generatedClips.map((c) => ({
            shot_id: c.shotId,
            url: c.url,
            trim_in: 0,
            duration: c.duration,
          })),
          audio: audioUrl ? { voiceover_url: audioUrl } : undefined,
        },
        projectId,
      );

      if (!renderResult || !renderResult.videoUrl) {
        throw new Error(
          `FFmpeg render completed without an output video URL for project "${projectId}".`,
        );
      }

      const finalMasterVideoUrl = renderResult.videoUrl;
      const renderStats = {
        renderTimeSeconds: renderResult.renderTimeSeconds,
        fps: renderResult.fps,
        encoderUsed: renderResult.encoderUsed,
      };
      console.log(
        `[Tool:generate_video:Step4:Success] ✅ Master video stitched with audio: ${finalMasterVideoUrl} (${renderStats.renderTimeSeconds}s @ ${renderStats.fps} fps)`,
      );

      console.log(
        `[Tool:generate_video:Complete] Video generated successfully in ${Date.now() - toolStart}ms`,
      );

      const totalDuration = generatedClips.reduce(
        (acc, c) => acc + c.duration,
        0,
      );

      // Return markdown with video player embed and asset links
      let markdown = `### 🎬 Video Ad: ${title} (${generatedClips.length} Clips, ${totalDuration}s Total Duration)\n\n`;
      markdown += `![${title}](${finalMasterVideoUrl})\n\n`;
      const rawDomain = process.env.R2_PUBLIC_DOMAIN || "";
      const cleanDomain = rawDomain.startsWith("http")
        ? rawDomain.replace(/\/$/, "")
        : `https://${rawDomain.replace(/\/$/, "")}`;
      const planUrl = `${cleanDomain}/harness/assets/videos/${projectId}/plan.json`;

      if (renderStats) {
        markdown += `**Production Details**:\n`;
        markdown += `- **Format**: 1080×1920 Vertical (9:16) MP4\n`;
        markdown += `- **Pacing**: ${generatedClips.length} Cuts (${totalDuration}s Total Duration)\n`;
        if (voiceDetails) {
          markdown += `- **Voice Cast**: ${voiceDetails}\n`;
        }
        markdown += `- **Assembly Plan (\`plan.json\`)**: [View Recipe](${planUrl})\n`;
        markdown += `- **Render Engine**: Apple Silicon Hardware VideoToolbox (${renderStats.renderTimeSeconds}s @ ${renderStats.fps} fps)\n`;
      }

      const assetMetadata: VideoAssetGroup = {
        type: "video",
        project_id: projectId,
        aspect_ratio: "9:16",
        format: "mp4",
        shots: generatedClips.map((c) => ({
          id: c.shotId,
          duration_sec: c.duration,
          ...(c.imageUrl
            ? {
                image: {
                  url: c.imageUrl,
                  format: "png" as const,
                },
              }
            : {}),
          clip: {
            url: c.url,
            format: "mp4" as const,
          },
        })),
        ...(audioUrl
          ? {
              audio: {
                url: audioUrl,
                format: "mp3",
                voice_id: args.voice_id || undefined,
                voice_name: voiceDetails || undefined,
                script: args.voiceover_script || undefined,
              },
            }
          : {}),
        plan: {
          url: planUrl,
          format: "json",
        },
        master_video: {
          url: finalMasterVideoUrl,
          format: "mp4",
        },
        created_at: new Date().toISOString(),
      };
      markdown += `\n<!-- ASSET_METADATA: ${JSON.stringify(assetMetadata)} -->`;

      return markdown;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[Tool:generate_video:Error] ❌ Failed after ${Date.now() - toolStart}ms: ${message}`,
        err,
      );
      let errorReturn = `❌ Video ad assembly failed for "${title}": ${message}`;
      errorReturn += `\nAll generated assets and plan.json are safely preserved in Cloudflare R2 under project "${projectId}".`;
      errorReturn += `\nDo not give up or return raw unstitched footage. Troubleshoot the error using search_web if needed and retry via retry_video_render({ project_id: "${projectId}" }).`;
      return errorReturn;
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as any);
