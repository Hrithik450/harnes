import sharp from "sharp";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function uploadImageToR2(
  base64Data: string,
  filename: string,
): Promise<string> {
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
    let contentType = "image/jpeg";

    if (base64Data.startsWith("data:")) {
      const matches = base64Data.match(
        /^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/,
      );
      if (matches && matches.length === 3) {
        buffer = Buffer.from(matches[2], "base64");
      } else {
        buffer = Buffer.from(base64Data, "base64");
      }
    } else {
      buffer = Buffer.from(base64Data, "base64");
    }

    // Convert to webp using sharp immediately before storage
    buffer = await sharp(buffer).webp({ quality: 90, effort: 5 }).toBuffer();
    contentType = "image/webp";

    // Validate buffer size (e.g., max 10MB)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (buffer.length > maxSizeBytes) {
      throw new Error(
        `Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max 10MB)`,
      );
    }

    const fileKey = `groweasy/harness/marketing-tool/${filename}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileKey,
      Body: buffer,
      ContentType: contentType,
    });

    await s3.send(command);

    const cleanDomain = publicDomain.endsWith("/")
      ? publicDomain.slice(0, -1)
      : publicDomain;
    const publicUrl = `${cleanDomain}/${fileKey}`;

    console.log(`[R2] Successfully uploaded: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error("[R2 Upload Error]", error);

    if (error instanceof Error) {
      // Provide specific error messages
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
