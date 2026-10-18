import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent/orchestrator";
import { getSessionFromCookies } from "@/lib/auth/session";
import { ThreadMessageService } from "@/lib/services";
import { AssetSchema, type Asset } from "@/lib/types/asset.types";

export const maxDuration = 300;

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json(
      { error: "Please login before sending messages" },
      { status: 401 },
    );
  }

  let body: { message?: unknown; threadId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400 },
    );
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const threadId =
    typeof body?.threadId === "string" ? body.threadId.trim() : undefined;

  if (!message) {
    return NextResponse.json(
      { error: "Message cannot be empty" },
      { status: 400 },
    );
  }

  if (!threadId) {
    return NextResponse.json(
      { error: "Thread ID is required" },
      { status: 400 },
    );
  }

  console.log(
    `[Chat:POST:Start] threadId=${threadId}, userId=${session.id}, message="${message.slice(0, 100)}..."`,
  );

  try {
    // 1. Persist user message to database
    const savedUserMsgRes = await ThreadMessageService.createMessage({
      thread_id: threadId,
      role: "user",
      content: { text: message },
    });

    if (!savedUserMsgRes.success) {
      console.error(
        "[Chat:POST:SaveUserError] Failed to persist user message:",
        savedUserMsgRes.error,
      );
    }

    // 2. Run agent
    const result = await runAgent(threadId, message, session.id);

    console.log(
      `[Chat:POST:Complete] ✅ Agent execution finished | total steps=${result.steps.length}`,
    );

    // 3. Extract final response text
    let finalContent = result.text.trim();
    if (!finalContent) {
      for (let i = result.steps.length - 1; i >= 0; i--) {
        const stepText = result.steps[i]?.text?.trim();
        if (stepText) {
          finalContent = stepText;
          break;
        }
      }
    }
    if (!finalContent) {
      for (const step of [...result.steps].reverse()) {
        for (const tr of [...(step.toolResults || [])].reverse()) {
          const val =
            (tr as { result?: unknown; output?: unknown }).result ??
            (tr as { result?: unknown; output?: unknown }).output;
          if (typeof val === "string" && val.trim()) {
            finalContent = val.trim();
            break;
          }
        }
        if (finalContent) break;
      }
    }
    if (!finalContent) {
      finalContent =
        "I wasn't able to produce a response for that. Could you rephrase or add a bit more detail?";
    }

    // 4. Extract asset metadata from tools if generated
    let detectedAsset: Asset | undefined;
    for (const step of result.steps) {
      for (const tr of step.toolResults || []) {
        const val =
          (tr as { result?: unknown; output?: unknown }).result ??
          (tr as { result?: unknown; output?: unknown }).output;
        const raw = typeof val === "string" ? val : "";
        const match = /<!--\s*ASSET_METADATA:\s*([\s\S]*?)\s*-->/.exec(raw);
        if (match) {
          try {
            const parsed = AssetSchema.safeParse(JSON.parse(match[1]));
            if (parsed.success) {
              detectedAsset = parsed.data;
              break;
            }
          } catch {
            // ignore JSON parse errors
          }
        }
      }
      if (detectedAsset) break;
    }

    // Clean finalContent of any trailing comment tags
    finalContent = finalContent
      .replace(/<!--\s*ASSET_METADATA:\s*[\s\S]*?-->/g, "")
      .trimEnd();

    // 5. Save assistant message to database with explicit text and assets
    const savedMsgRes = await ThreadMessageService.createMessage({
      thread_id: threadId,
      role: "assistant",
      content: {
        text: finalContent,
        ...(detectedAsset ? { assets: detectedAsset } : {}),
      },
    });

    if (!savedMsgRes.success || !savedMsgRes.data) {
      console.error(
        "[Chat:POST:SaveError] Failed to persist assistant message:",
        savedMsgRes.error,
      );
    }

    return NextResponse.json({
      success: true,
      text: finalContent,
      userMessage: savedUserMsgRes.data,
      message: savedMsgRes.data || {
        id: crypto.randomUUID(),
        thread_id: threadId,
        role: "assistant",
        content: {
          text: finalContent,
          ...(detectedAsset ? { assets: detectedAsset } : {}),
        },
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[Chat:POST:Error] Exception during agent execution:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.message.includes("timed out")
            ? "The response took too long to generate. Please try again."
            : err instanceof Error
              ? err.message
              : "Something went wrong while generating the response.",
      },
      { status: 500 },
    );
  }
}
