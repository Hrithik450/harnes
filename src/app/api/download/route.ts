import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const filename =
    request.nextUrl.searchParams.get("filename") || "image.webp";

  if (!url) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return new NextResponse("Invalid protocol", { status: 400 });
    }

    const response = await fetch(url);
    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, {
        status: response.status,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "image/webp";

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
