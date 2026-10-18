import sharp from "sharp";
import { Buffer } from "node:buffer";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { retryWithBackoff } from "@/lib/utils/retry";

/**
 * Sanitizes and normalizes an open storage path, ensuring it is cleanly
 * rooted under harness/assets/ with zero path traversal risks.
 */
export function sanitizeStorageFolder(folder?: string): string {
  if (!folder || !folder.trim()) {
    return "harness/assets/marketing-tool";
  }

  const cleaned = folder
    .trim()
    .replace(/\\/g, "/") // Normalize backslashes
    .replace(/\.{2,}/g, "") // Remove directory traversal
    .replace(/[^a-zA-Z0-9_\-\/]/g, "") // Keep alphanumeric, hyphens, underscores, slashes
    .replace(/\/+/g, "/") // Collapse multi-slashes
    .replace(/^\/+|\/+$/g, ""); // Trim leading and trailing slashes

  if (!cleaned) {
    return "harness/assets/marketing-tool";
  }

  if (cleaned.startsWith("harness/assets/")) {
    return cleaned;
  }
  if (cleaned === "harness/assets") {
    return cleaned;
  }
  if (cleaned.startsWith("assets/")) {
    return `harness/${cleaned}`;
  }
  return `harness/assets/${cleaned}`;
}

export async function uploadImageToR2(
  base64Data: string,
  filename: string,
  format: "webp" | "png" | "jpeg" = "webp",
  folder: string = "harness/assets/marketing-tool",
): Promise<string> {
  const startTime = Date.now();
  console.log(
    `[R2:UploadImage:Start] folder="${folder}", file="${filename}", format=${format}, inputBase64Len=${(base64Data.length / 1024).toFixed(1)}KB`,
  );

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !publicDomain
  ) {
    const missing = [
      !accountId && "R2_ACCOUNT_ID",
      !accessKeyId && "R2_ACCESS_KEY_ID",
      !secretAccessKey && "R2_SECRET_ACCESS_KEY",
      !bucketName && "R2_BUCKET_NAME",
      !publicDomain && "R2_PUBLIC_DOMAIN",
    ].filter(Boolean);
    console.error(`[R2:UploadImage:ConfigError] ❌ Missing environment variables: ${missing.join(", ")}`);
    throw new Error("Missing R2 configuration in environment variables");
  }

  try {
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      requestHandler: {
        requestTimeout: 30000, // 30 second timeout
      },
    });

    // Extract base64 content type and data
    let buffer: Buffer;
    if (base64Data.startsWith("data:")) {
      const parts = base64Data.split(",");
      if (parts.length > 1) {
        buffer = Buffer.from(parts[1], "base64");
      } else {
        throw new Error("Invalid data URI format");
      }
    } else {
      buffer = Buffer.from(base64Data, "base64");
    }

    // Convert to requested format using sharp
    let contentType = "image/webp";
    if (format === "png") {
      buffer = await sharp(buffer).png({ compressionLevel: 8 }).toBuffer();
      contentType = "image/png";
    } else if (format === "jpeg") {
      buffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
      contentType = "image/jpeg";
    } else {
      buffer = await sharp(buffer).webp({ quality: 90, effort: 5 }).toBuffer();
      contentType = "image/webp";
    }

    console.log(
      `[R2:UploadImage:Processed] sharp converted to ${format} (${(buffer.length / 1024).toFixed(1)}KB)`,
    );

    // Validate buffer size (e.g., max 10MB)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (buffer.length > maxSizeBytes) {
      throw new Error(
        `Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max 10MB)`,
      );
    }

    const cleanFolder = sanitizeStorageFolder(folder);
    const fileKey = `${cleanFolder}/${filename}`;

    console.log(
      `[R2:UploadImage:S3Send] Uploading ${(buffer.length / 1024).toFixed(1)}KB to bucket="${bucketName}", key="${fileKey}"...`,
    );

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: contentType,
    });

    await retryWithBackoff(
      () => s3.send(command),
      {
        maxRetries: 3,
        initialDelay: 500,
        shouldRetry: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          return msg.includes("SlowDown") || msg.includes("500") || msg.includes("503") || msg.includes("timeout") || msg.includes("ECONNRESET");
        },
      },
    );

    const cleanDomain = publicDomain.endsWith("/")
      ? publicDomain.slice(0, -1)
      : publicDomain;
    const publicUrl = `${cleanDomain}/${fileKey}`;

    console.log(
      `[R2:UploadImage:Success] ✅ Image uploaded successfully in ${Date.now() - startTime}ms -> ${publicUrl}`,
    );

    return publicUrl;
  } catch (error) {
    console.error(
      `[R2:UploadImage:Error] ❌ Failed to upload image "${filename}" to "${folder}" after ${Date.now() - startTime}ms:`,
      error,
    );

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        throw new Error("Upload timed out. Please try again.");
      }
      if (error.message.includes("credentials")) {
        throw new Error("Storage credentials invalid. Please contact support.");
      }
      if (error.message.includes("AccessDenied")) {
        throw new Error("Storage access denied. Please contact support.");
      }
    }

    throw new Error(
      `Failed to upload image: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Upload arbitrary media buffer (e.g. video clips, audio tracks, PDFs) to Cloudflare R2
 */
export async function uploadMediaToR2(
  buffer: Buffer,
  filename: string,
  contentType: string,
  folder: string = "harness/assets",
): Promise<string> {
  const startTime = Date.now();
  console.log(
    `[R2:UploadMedia:Start] folder="${folder}", file="${filename}", contentType=${contentType}, size=${(buffer.length / 1024 / 1024).toFixed(2)}MB`,
  );

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !publicDomain
  ) {
    console.error("[R2:UploadMedia:ConfigError] ❌ Missing R2 configuration in environment variables");
    throw new Error("Missing R2 configuration in environment variables");
  }

  try {
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      requestHandler: {
        requestTimeout: 60000,
      },
    });

    const cleanFolder = sanitizeStorageFolder(folder);
    const fileKey = `${cleanFolder}/${filename}`;

    console.log(
      `[R2:UploadMedia:S3Send] Uploading to bucket="${bucketName}", key="${fileKey}"...`,
    );

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: contentType,
    });

    await retryWithBackoff(
      () => s3.send(command),
      {
        maxRetries: 3,
        initialDelay: 500,
        shouldRetry: (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          return msg.includes("SlowDown") || msg.includes("500") || msg.includes("503") || msg.includes("timeout") || msg.includes("ECONNRESET");
        },
      },
    );

    const cleanDomain = publicDomain.endsWith("/")
      ? publicDomain.slice(0, -1)
      : publicDomain;
    const publicUrl = `${cleanDomain}/${fileKey}`;

    console.log(
      `[R2:UploadMedia:Success] ✅ Media uploaded successfully in ${Date.now() - startTime}ms -> ${publicUrl}`,
    );

    return publicUrl;
  } catch (error) {
    console.error(
      `[R2:UploadMedia:Error] ❌ Failed to upload media "${filename}" to "${folder}" after ${Date.now() - startTime}ms:`,
      error,
    );
    throw error;
  }
}

/**
 * Upload arbitrary JSON data (e.g. video assembly plan.json) to Cloudflare R2
 */
export async function uploadJsonToR2(
  data: unknown,
  filename: string = "plan.json",
  folder: string = "harness/assets",
): Promise<string> {
  const jsonString =
    typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const buffer = Buffer.from(jsonString, "utf-8");
  return uploadMediaToR2(buffer, filename, "application/json", folder);
}

/**
 * Retrieve and parse a JSON document from Cloudflare R2 by key or folder path
 */
export async function getJsonFromR2<T = unknown>(
  keyOrPath: string,
): Promise<T | null> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("Missing R2 configuration in environment variables");
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    requestHandler: {
      requestTimeout: 30000,
    },
  });

  const raw = keyOrPath.trim();
  let folder: string;
  let filename = "plan.json";

  if (raw.endsWith(".json")) {
    const parts = raw.split("/");
    filename = parts.pop() || "plan.json";
    folder = parts.join("/");
  } else {
    folder = raw;
  }

  const cleanFolder = sanitizeStorageFolder(folder);
  const fileKey = `${cleanFolder}/${filename}`;

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
    });
    const response = await s3.send(command);
    const content = await response.Body?.transformToString("utf-8");
    if (!content) return null;
    return JSON.parse(content) as T;
  } catch (err: unknown) {
    const errorObj = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (errorObj?.name === "NoSuchKey" || errorObj?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    console.error(`[R2:GetJson:Error] Failed to fetch JSON for key="${fileKey}":`, err);
    throw err;
  }
}

export interface R2StoredAsset {
  key: string;
  filename: string;
  publicUrl: string;
  sizeBytes: number;
  lastModified?: Date;
  assetType: "image" | "video" | "audio" | "plan" | "other";
}

/**
 * Lists stored media assets from Cloudflare R2 under a specific folder prefix.
 * Useful for inspecting existing project stills, clips, and audio tracks for reuse/retry.
 */
export async function listAssetsFromR2(
  folderOrPrefix: string,
): Promise<R2StoredAsset[]> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !publicDomain
  ) {
    console.error("[R2:ListAssets:ConfigError] ❌ Missing R2 configuration in environment variables");
    throw new Error("Missing R2 configuration in environment variables");
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    requestHandler: {
      requestTimeout: 30000,
    },
  });

  const cleanPrefix = sanitizeStorageFolder(folderOrPrefix);
  const cleanDomain = publicDomain.endsWith("/")
    ? publicDomain.slice(0, -1)
    : publicDomain;

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: cleanPrefix,
  });

  const response = await s3.send(command);
  const contents = response.Contents || [];

  return contents.map((item) => {
    const key = item.Key || "";
    const filename = key.split("/").pop() || key;
    const lower = filename.toLowerCase();

    let assetType: R2StoredAsset["assetType"] = "other";
    if (
      lower.endsWith(".png") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg")
    ) {
      assetType = "image";
    } else if (
      lower.endsWith(".mp4") ||
      lower.endsWith(".mov") ||
      lower.endsWith(".webm")
    ) {
      assetType = "video";
    } else if (
      lower.endsWith(".mp3") ||
      lower.endsWith(".wav") ||
      lower.endsWith(".m4a")
    ) {
      assetType = "audio";
    } else if (lower.endsWith(".json")) {
      assetType = "plan";
    }

    return {
      key,
      filename,
      publicUrl: `${cleanDomain}/${key}`,
      sizeBytes: item.Size || 0,
      lastModified: item.LastModified,
      assetType,
    };
  });
}

export interface R2InspectionResult {
  bucket: string;
  prefix: string;
  totalObjects: number;
  totalSizeBytes: number;
  totalSizeMb: string;
  storageBreakdown: {
    images: number;
    videos: number;
    audio: number;
    other: number;
  };
  objects: Array<{
    key: string;
    filename: string;
    publicUrl: string;
    sizeKb: string;
    lastModified?: string;
    eTag?: string;
    assetType: "image" | "video" | "audio" | "other";
  }>;
}

/**
 * Performs deep inspection of Cloudflare R2 storage under a specific prefix.
 * Analyzes storage health, object counts, total byte usage, and individual object metadata.
 */
export async function inspectR2Storage(
  folderOrPrefix: string = "harness/assets",
): Promise<R2InspectionResult> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicDomain = process.env.R2_PUBLIC_DOMAIN;

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !publicDomain
  ) {
    console.error("[R2:Inspect:ConfigError] ❌ Missing R2 configuration in environment variables");
    throw new Error("Missing R2 configuration in environment variables");
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    requestHandler: {
      requestTimeout: 30000,
    },
  });

  const cleanPrefix = sanitizeStorageFolder(folderOrPrefix);
  const cleanDomain = publicDomain.endsWith("/")
    ? publicDomain.slice(0, -1)
    : publicDomain;

  const command = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: cleanPrefix,
  });

  const response = await s3.send(command);
  const contents = response.Contents || [];

  let totalSizeBytes = 0;
  const breakdown = { images: 0, videos: 0, audio: 0, other: 0 };

  const objects = contents.map((item) => {
    const key = item.Key || "";
    const filename = key.split("/").pop() || key;
    const lower = filename.toLowerCase();
    const size = item.Size || 0;
    totalSizeBytes += size;

    let assetType: "image" | "video" | "audio" | "other" = "other";
    if (
      lower.endsWith(".png") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg")
    ) {
      assetType = "image";
      breakdown.images++;
    } else if (
      lower.endsWith(".mp4") ||
      lower.endsWith(".mov") ||
      lower.endsWith(".webm")
    ) {
      assetType = "video";
      breakdown.videos++;
    } else if (
      lower.endsWith(".mp3") ||
      lower.endsWith(".wav") ||
      lower.endsWith(".m4a")
    ) {
      assetType = "audio";
      breakdown.audio++;
    } else {
      breakdown.other++;
    }

    return {
      key,
      filename,
      publicUrl: `${cleanDomain}/${key}`,
      sizeKb: (size / 1024).toFixed(1),
      lastModified: item.LastModified ? item.LastModified.toISOString() : undefined,
      eTag: item.ETag ? item.ETag.replace(/"/g, "") : undefined,
      assetType,
    };
  });

  return {
    bucket: bucketName,
    prefix: cleanPrefix,
    totalObjects: contents.length,
    totalSizeBytes,
    totalSizeMb: (totalSizeBytes / 1024 / 1024).toFixed(2),
    storageBreakdown: breakdown,
    objects,
  };
}


