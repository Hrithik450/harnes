import { z } from "zod";

/**
 * 1. Single Asset File
 * Exactly 4 clean metadata fields: url, storage_key, format, size_bytes.
 */
export const AssetFileSchema = z.object({
  url: z.string().url(),
  storage_key: z.string().optional(),
  format: z.string().default("png"), // "png" | "webp" | "mp4" | "mp3" | "json"
  size_bytes: z.number().optional(),
});
export type AssetFile = z.infer<typeof AssetFileSchema>;

/**
 * 2. Image Variant (Single Image or A/B Test Variant)
 * Contains id, image, aspect_ratio, created_at. (Zero fluff: no title, no project_id).
 */
export const ImageVariantSchema = z.object({
  id: z.string(), // e.g. "variant_1", "variant_a"
  image: AssetFileSchema,
  aspect_ratio: z.enum(["1:1", "9:16", "16:9", "4:5"]).default("1:1"),
  created_at: z.string().datetime().optional().default(() => new Date().toISOString()),
});
export type ImageVariant = z.infer<typeof ImageVariantSchema>;

/**
 * Top-Level Image Deliverable (Type "image")
 */
export const ImageAssetGroupSchema = z.object({
  type: z.literal("image"),
  variants: z.array(ImageVariantSchema), // 1 to 3 variants strictly
});
export type ImageAssetGroup = z.infer<typeof ImageAssetGroupSchema>;

/**
 * 3. Video Shot Group (Nesting: S01 binds image still + video clip together)
 * Contains id, image, clip, duration_sec. (No motion prompt).
 */
export const VideoShotGroupSchema = z.object({
  id: z.string(), // "S01", "S02"
  image: AssetFileSchema.optional(), // 9:16 vertical anchor still PNG
  clip: AssetFileSchema.optional(),  // SeaDance motion MP4 clip
  duration_sec: z.number().optional().default(4),
});
export type VideoShotGroup = z.infer<typeof VideoShotGroupSchema>;

/**
 * Audio Track Deliverable (Voiceover narration)
 */
export const AudioTrackDeliverableSchema = AssetFileSchema.extend({
  voice_id: z.string().optional(),
  voice_name: z.string().optional(),
  script: z.string().optional(),
});
export type AudioTrackDeliverable = z.infer<typeof AudioTrackDeliverableSchema>;

/**
 * Top-Level Video Deliverable (Type "video")
 * Contains project_id, aspect_ratio, format, shots, audio, plan, master_video, created_at. (No title).
 */
export const VideoAssetGroupSchema = z.object({
  type: z.literal("video"),
  project_id: z.string(), // e.g. "proj_mvdobnlt_s1yf"
  aspect_ratio: z.enum(["9:16", "16:9", "1:1", "4:5"]).default("9:16"),
  format: z.string().default("mp4"),
  shots: z.array(VideoShotGroupSchema),
  audio: AudioTrackDeliverableSchema.optional(),
  plan: AssetFileSchema.optional(),         // plan.json
  master_video: AssetFileSchema.optional(), // Master stitched MP4
  created_at: z.string().datetime().optional().default(() => new Date().toISOString()),
});
export type VideoAssetGroup = z.infer<typeof VideoAssetGroupSchema>;

/**
 * Clean Discriminated Union on `type` ("image" | "video")
 * Zero generic asset overhead. 100% strict isolation.
 */
export const AssetSchema = z.discriminatedUnion("type", [
  ImageAssetGroupSchema,
  VideoAssetGroupSchema,
]);
export type Asset = z.infer<typeof AssetSchema>;
