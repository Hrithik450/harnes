import { generateText, isStepCount } from "ai";
import { getAgentModel } from "@/lib/providers";
import { createSliceMessageTool } from "../tools/internal/slice.message.tool";
import { normalizeMessageContent, splitMessageLines } from "@/lib/utils";
import type { ThreadMessage } from "@/lib/repositories/types/thread.message.types";
import type { Asset } from "@/lib/types/asset.types";

export interface ContextSlicerOutput {
  user_intent?: string;
  referenced_items?: string[];
  is_standalone: boolean;
  selected_slices: {
    message_id: string;
    start_line: number;
    line_count: number;
  }[];
  reasoning: string;
}

export type ContextMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/**
 * Preview assistant message text with clean lines and section headings.
 */
function previewAssistant(text: string): string {
  const lines = splitMessageLines(text).filter((l) => l.trim());
  const headings = lines.filter((l) => /^#{1,4}\s/.test(l)).slice(0, 4);
  const first = lines.slice(0, 2).join(" ").slice(0, 200);
  return `${first}${headings.length ? ` | Sections: ${headings.join(" / ").slice(0, 200)}` : ""}`;
}

/**
 * Formats structured asset deliverable into high-signal summary for the skeleton index.
 */
function assetSummary(a: Asset): string {
  if (a.type === "video") {
    return `video project=${a.project_id}, shots=[${(a.shots ?? []).map((s) => s.id).join(",")}], audio=${!!a.audio?.url}, master=${!!a.master_video?.url}`;
  }
  if (a.type === "image") {
    return `images variants=[${a.variants.map((v) => `${v.id}:${v.aspect_ratio}`).join(",")}]`;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (a as any).type || "unknown";
}

/**
 * Formats an active asset deliverable (video project or image variants)
 * into a compact, high-signal manifest for automatic in-context injection.
 */
export function formatActiveAssetsManifest(assets: Asset): string {
  if (assets.type === "video") {
    const lines: string[] = [
      `[Active Thread Assets:`,
      ` - Project: ${assets.project_id}`,
    ];
    if (assets.master_video?.url) {
      lines.push(` - Master Stitched Video: ${assets.master_video.url}`);
    }
    if (assets.plan?.url) {
      lines.push(` - Plan: ${assets.plan.url}`);
    }
    if (assets.shots && assets.shots.length > 0) {
      for (const s of assets.shots) {
        if (s.image?.url) {
          lines.push(` - ${s.id} Anchor Image: ${s.image.url}`);
        }
        if (s.clip?.url) {
          lines.push(` - ${s.id} Motion Clip: ${s.clip.url}`);
        }
      }
    }
    if (assets.audio?.url) {
      let audioLine = ` - Audio Voiceover: ${assets.audio.url}`;
      if (assets.audio.voice_name || assets.audio.voice_id) {
        audioLine += ` (Voice: ${assets.audio.voice_name || assets.audio.voice_id})`;
      }
      lines.push(audioLine);
    }
    lines.push(`]`);
    return lines.join("\n");
  }

  if (assets.type === "image") {
    const lines: string[] = [
      `[Active Thread Assets:`,
      ` - Marketing Images (${assets.variants.length} Variant${assets.variants.length > 1 ? "s" : ""}):`,
    ];
    for (const v of assets.variants) {
      lines.push(
        ` - ${v.id} (${v.aspect_ratio}, ${v.image.format || "webp"}): ${v.image.url}`,
      );
    }
    lines.push(`]`);
    return lines.join("\n");
  }

  return "";
}

const SYSTEM_INSTRUCTION = `You are the Conversation History Slicer Sub-Agent. Your job is to decide which parts of past ASSISTANT messages the orchestrator needs to answer the current user message, while avoiding token bloat. Wrongly dropping needed context is far worse than including a few extra lines.

## Process (follow in order, do not skip)

STEP 1: Understand intent
Read the current user message and the user turns in the skeleton. State in one sentence what the user wants and what they are referring to. Look for:
- Pronouns / deictic references: "it", "that", "this", "the second one", "the last version", "same as before"
- Edit verbs: "change", "make it", "redo", "regenerate", "retry", "shorter", "add", "remove", "continue", "use X instead"
- Assets: images, variants, video, shots, clip, audio, voiceover, plan, script, aspect ratio
- Answers to a question the assistant asked (questionnaire answers, "yes", "option 2", "go ahead")

STEP 2: Classify
- STANDALONE only if the message is fully self-contained AND does not depend on anything produced earlier (greeting, a brand-new unrelated question, a brand-new task with all the details included).
- Otherwise FOLLOW-UP. If you are unsure, choose FOLLOW-UP.

STEP 3: Find every associated assistant message (follow-ups only)
Build a candidate list. Include:
- The assistant message that the user message directly answers or refines.
- Any message marked [HAS_EMBEDDED_ACTION] if the user is answering or continuing it.
- Any message marked [HAS_ASSETS] if the user is referring to, editing, or regenerating a deliverable.
- Earlier messages if the user references "the original", "the first version", or an older deliverable.
- Chains: if a message builds on an earlier one (plan -> script -> assets), include both.
Several messages may qualify. Do not stop at the first one.

STEP 4: Inspect with slice_message
- You MUST call slice_message on every candidate before selecting it. Never select a slice you have not read.
- If the first slice doesn't contain what you need, call again with a different start_line.
- Use 10-40 lines per slice. Prefer covering the full relevant section over saving a few lines.

STEP 5: Output strict JSON. Fill "user_intent" and "referenced_items" BEFORE the decision.
\`\`\`json
{
  "user_intent": "one sentence",
  "referenced_items": ["e.g. image variant v2", "the questionnaire in message <uuid>"],
  "is_standalone": boolean,
  "selected_slices": [{ "message_id": "UUID", "start_line": number, "line_count": number }],
  "reasoning": "why these slices and why others were excluded"
}
\`\`\`

## Hard rules
- If is_standalone is false, selected_slices MUST NOT be empty.
- Questionnaire answers / "continue" / "retry" / "go ahead": always include the substantive assistant message they respond to.
- Only use message_ids that appear in the skeleton.
`;

/**
 * Parses the context agent's response into a structured ContextSlicerOutput.
 */
function parseContextAgentResult(
  text: string,
  toolSlices: { message_id: string; start_line: number; line_count: number }[],
): ContextSlicerOutput | null {
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const rawJson = jsonMatch ? jsonMatch[1] : text;
    const firstBrace = rawJson.indexOf("{");
    const lastBrace = rawJson.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const parsed = JSON.parse(rawJson.slice(firstBrace, lastBrace + 1));
      if (typeof parsed.is_standalone === "boolean") {
        return {
          user_intent:
            typeof parsed.user_intent === "string"
              ? parsed.user_intent
              : undefined,
          referenced_items: Array.isArray(parsed.referenced_items)
            ? parsed.referenced_items.map(String)
            : undefined,
          is_standalone: parsed.is_standalone,
          selected_slices: Array.isArray(parsed.selected_slices)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? parsed.selected_slices.map((s: any) => ({
                message_id: String(s.message_id || "").trim(),
                start_line: Number(s.start_line || 1),
                line_count: Number(s.line_count || 10),
              }))
            : toolSlices,
          reasoning: parsed.reasoning || "Parsed from agent JSON",
        };
      }
    }
  } catch (err) {
    console.warn("[ContextAgent:Parser] Failed to parse JSON response:", err);
  }

  // If tool slices were executed during generation, assume follow-up with those slices
  if (toolSlices.length > 0) {
    return {
      is_standalone: false,
      selected_slices: toolSlices,
      reasoning: "Derived from internal slice_message tool calls",
    };
  }

  return null;
}

/**
 * Deterministic guardrail to validate slices, clamp line ranges,
 * and backfill context for follow-up turns if the model returned empty or invalid slices.
 */
function enforceFollowUpSlices(
  out: ContextSlicerOutput,
  toolSlices: ContextSlicerOutput["selected_slices"],
  messages: ThreadMessage[],
  map: Map<string, ThreadMessage>,
): ContextSlicerOutput {
  if (out.is_standalone) return out;

  // Keep only valid UUIDs that exist in memory
  let slices = (out.selected_slices || []).filter((s) =>
    map.has(s.message_id.trim()),
  );

  // Clamp line numbers to actual line count of the target message
  slices = slices.map((s) => {
    const targetMsg = map.get(s.message_id.trim())!;
    const totalLines = splitMessageLines(targetMsg.content.text).length || 1;
    const startLine = Math.max(1, Math.min(s.start_line || 1, totalLines));
    const lineCount = Math.max(
      1,
      Math.min(s.line_count || 20, totalLines - startLine + 1),
    );
    return {
      message_id: s.message_id.trim(),
      start_line: startLine,
      line_count: lineCount,
    };
  });

  // Fall back to slices the model actually inspected via the tool
  if (slices.length === 0) {
    slices = toolSlices.filter((s) => map.has(s.message_id.trim()));
  }

  // Last resort: latest assistant message with action or assets, else latest assistant message
  if (slices.length === 0) {
    const assistants = messages.filter((m) => m.role === "assistant");
    const pick =
      [...assistants].reverse().find(
        (m) => map.get(m.id)?.content.action || map.get(m.id)?.content.assets,
      ) ?? assistants[assistants.length - 1];
    if (pick) {
      slices = [{ message_id: pick.id, start_line: 1, line_count: 40 }];
    }
  }

  return { ...out, selected_slices: slices };
}

/**
 * Autonomous Conversation History Slicer Sub-Agent.
 *
 * Uses defaultAgentModel and the internal `slice_message` tool to:
 * 1. Filter out 100% of historical tokens for standalone questions.
 * 2. Surgically include only specific lines of relevant AI messages for follow-ups.
 * 3. Preserve in-memory efficiency with zero redundant DB queries.
 * 4. Protect execution with a 60,000ms timeout and resilient fallback.
 */
export async function resolveSurgicallySlicedContext(
  threadId: string | undefined,
  currentMessage: string,
  history: ThreadMessage[] | undefined | null,
): Promise<ContextMessage[]> {
  const startTime = Date.now();

  // 1. Edge case: No historical messages exist
  if (!history || history.length === 0) {
    console.log(
      `[ContextAgent] No prior history found for thread="${threadId || "new"}". Passing only current message.`,
    );
    return [{ role: "user", content: currentMessage }];
  }

  // 2. Load messages into memory map using single source of truth: ThreadMessage
  const recentMessages = history;
  const messagesMap = new Map<string, ThreadMessage>();
  let hasAssistantMessage = false;

  for (const m of recentMessages) {
    const normalized = normalizeMessageContent(m.content);
    let action = normalized.action;

    // If not on object, parse directly from XML <ui-action> block
    if (!action && normalized.text.includes("<ui-action>")) {
      const match = /<ui-action>\s*([\s\S]*?)\s*<\/ui-action>/.exec(
        normalized.text,
      );
      if (match) {
        try {
          action = JSON.parse(match[1]);
        } catch {
          // Ignore parse errors on malformed markdown blocks
        }
      }
    }

    m.content = {
      ...normalized,
      action,
    };

    messagesMap.set(m.id, m);
    if (m.role === "assistant") {
      hasAssistantMessage = true;
    }
  }

  // Find the most recent active asset deliverables by type (so video creation doesn't wipe image assets)
  const latestAssets = new Map<string, Asset>();
  for (const m of recentMessages) {
    const a = messagesMap.get(m.id)?.content?.assets;
    if (a && a.type) {
      latestAssets.set(a.type, a); // later messages overwrite earlier ones of same type
    }
  }

  const manifest = [...latestAssets.values()]
    .map(formatActiveAssetsManifest)
    .filter(Boolean)
    .join("\n\n");

  // If there are no assistant messages to slice, pass recent user turns directly
  if (!hasAssistantMessage) {
    console.log(
      `[ContextAgent] No AI assistant messages found in recent ${recentMessages.length} turns. Returning compact history.`,
    );
    const activeAssetManifest = manifest ? `${manifest}\n\n` : "";
    return [
      ...recentMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: messagesMap.get(m.id)!.content.text,
      })),
      { role: "user", content: `${activeAssetManifest}${currentMessage}` },
    ];
  }

  // 3. Construct the informative Skeleton Index with real signal (preview + asset summary)
  let skeleton = "### Recent Conversation Skeleton Index (Oldest to Newest):\n";
  for (const m of recentMessages) {
    const msg = messagesMap.get(m.id)!;
    const totalLines = splitMessageLines(msg.content.text).length;
    if (m.role === "assistant") {
      const actionHint = msg.content.action
        ? ` [HAS_EMBEDDED_ACTION: type="${(msg.content.action as { type?: string }).type || "unknown"}"]`
        : "";
      const assetHint = msg.content.assets
        ? ` [HAS_ASSETS: ${assetSummary(msg.content.assets)}]`
        : "";
      skeleton += `- [UUID: ${m.id}] [ROLE: ASSISTANT] [Total Lines: ${totalLines}]${actionHint}${assetHint}\n  Preview: ${previewAssistant(msg.content.text)}\n`;
    } else if (m.role === "user") {
      skeleton += `- [UUID: ${m.id}] [ROLE: USER] [Total Lines: ${totalLines}]:\n  "${msg.content.text.replace(/\s+/g, " ").slice(0, 300)}"\n`;
    }
  }

  console.log(
    `[ContextAgent:Start] Analyzing ${recentMessages.length} messages for thread="${threadId || "new"}"...`,
  );

  try {
    const timeoutSignal = AbortSignal.timeout(60000);

    const result = await generateText({
      model: getAgentModel(),
      system: SYSTEM_INSTRUCTION,
      prompt: `Current Incoming User Message:\n"${currentMessage}"\n\n${skeleton}\n`,
      tools: {
        slice_message: createSliceMessageTool(messagesMap),
      },
      stopWhen: isStepCount(50),
      abortSignal: timeoutSignal,
    });

    const toolCallSlices = result.steps.flatMap((step) =>
      (step.toolCalls || [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((call: any) => call.toolName === "slice_message")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((call: any) => {
          const args = call.input ?? call.args ?? {};
          return {
            message_id: String(args.message_id || "").trim(),
            start_line: Number(args.start_line || 1),
            line_count: Number(args.line_count || 10),
          };
        })
        .filter((s) => messagesMap.has(s.message_id)),
    );

    const parsedRaw = parseContextAgentResult(result.text, toolCallSlices);
    const parsedOutput = parsedRaw
      ? enforceFollowUpSlices(
          parsedRaw,
          toolCallSlices,
          recentMessages,
          messagesMap,
        )
      : null;

    if (parsedOutput) {
      const inspected = new Set(toolCallSlices.map((s) => s.message_id));
      const uninspected = parsedOutput.selected_slices.some(
        (s) => !inspected.has(s.message_id),
      );
      if (!parsedOutput.is_standalone && uninspected) {
        console.warn(
          `[ContextAgent:Uninspected] Model selected slices without calling slice_message first:`,
          parsedOutput.selected_slices
            .filter((s) => !inspected.has(s.message_id))
            .map((s) => s.message_id),
        );
      }

      console.log(
        `[ContextAgent:Success] Decision in ${Date.now() - startTime}ms: standalone=${parsedOutput.is_standalone}, intent="${parsedOutput.user_intent || "none"}", items=[${(parsedOutput.referenced_items || []).join(", ")}], slices=${parsedOutput.selected_slices.length}, reason="${parsedOutput.reasoning}"`,
      );

      // STANDALONE QUESTION: 100% token savings! Pass 0 past messages
      if (parsedOutput.is_standalone) {
        // Safety net: check if user references deliverables/assets despite standalone classification
        const hasAssetKeyword =
          /\b(image|images|video|videos|shot|shots|clip|clips|audio|voice|voiceover|variant|variants|poster|posters|banner|banners|reel|reels|ad|ads)\b/i.test(
            currentMessage,
          );
        if (latestAssets.size > 0 && hasAssetKeyword) {
          console.log(
            `[ContextAgent:SafetyNet] Standalone query contains asset keywords and ${latestAssets.size} active deliverable(s) exist. Attaching asset manifest.`,
          );
          const activeAssetManifest = manifest ? `${manifest}\n\n` : "";
          return [
            {
              role: "user",
              content: `${activeAssetManifest}${currentMessage}`,
            },
          ];
        }
        console.log(
          `[ContextAgent:Prune] 🚀 Standalone query detected. Dropped all ${recentMessages.length} past messages (100% token savings).`,
        );
        return [{ role: "user", content: currentMessage }];
      }

      // FOLLOW-UP QUESTION: Reconstruct surgically sliced context
      const slicedMessages: ContextMessage[] = [];
      const slicesByMsgId = new Map<
        string,
        { start_line: number; line_count: number }
      >();
      for (const s of parsedOutput.selected_slices) {
        slicesByMsgId.set(s.message_id.trim(), s);
      }

      for (const m of recentMessages) {
        const msg = messagesMap.get(m.id)!;
        if (m.role === "user") {
          slicedMessages.push({
            role: "user",
            content: msg.content.text,
          });
        } else if (m.role === "assistant") {
          const slice = slicesByMsgId.get(m.id);
          if (slice) {
            // Sliced AI message
            const allLines = splitMessageLines(msg.content.text);
            const startIdx = Math.max(0, slice.start_line - 1);
            const endIdx = Math.min(
              allLines.length,
              startIdx + slice.line_count,
            );
            const contentSlice = allLines.slice(startIdx, endIdx).join("\n");

            // If this assistant message had an embedded UI action (e.g. a questionnaire),
            // append a compact JSON summary so the AI knows what it was asking.
            let actionSuffix = "";
            if (msg.content.action) {
              actionSuffix = `\n\n[Embedded UI Action — sent to user alongside above response]\n\`\`\`json\n${JSON.stringify(msg.content.action, null, 2)}\n\`\`\``;
            }

            let assetSuffix = "";
            if (msg.content.assets) {
              assetSuffix = `\n\n${formatActiveAssetsManifest(msg.content.assets)}`;
            }

            slicedMessages.push({
              role: "assistant",
              content: `[Historical Excerpt Lines ${startIdx + 1}-${endIdx} of ${allLines.length}]:\n${contentSlice}${actionSuffix}${assetSuffix}`,
            });
          }
          // If no slice was requested for this assistant message, it is completely dropped!
        }
      }

      // Automatically inject active thread assets manifest at the start of current message for follow-ups
      const activeAssetManifest = manifest ? `${manifest}\n\n` : "";

      slicedMessages.push({
        role: "user",
        content: `${activeAssetManifest}${currentMessage}`,
      });

      console.log(
        `[ContextAgent:Reconstructed] Follow-up context assembled: ${slicedMessages.length} messages (retained ${slicesByMsgId.size} sliced AI turns out of ${recentMessages.filter((m) => m.role === "assistant").length}).`,
      );

      return slicedMessages;
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[ContextAgent:Fallback] Slicing sub-agent fallback triggered after ${Date.now() - startTime}ms (${errorMsg}). Using safe minimal context.`,
    );
  }

  // 5. Resilient Fallback (in case of timeout or model error)
  // Revert to passing the last 4 messages, capping any assistant response to 40 lines
  const fallbackMessages: ContextMessage[] = [];
  const tail = recentMessages.slice(-4);

  for (const m of tail) {
    const msg = messagesMap.get(m.id)!;
    if (m.role === "assistant") {
      const lines = splitMessageLines(msg.content.text);
      const capped = lines.slice(0, 40).join("\n");
      const truncationNote =
        lines.length > 40
          ? `\n...[truncated ${lines.length - 40} lines for token optimization]`
          : "";
      const actionSuffix = msg.content.action
        ? `\n\n[Embedded UI Action — sent to user alongside above response]\n\`\`\`json\n${JSON.stringify(msg.content.action, null, 2)}\n\`\`\``
        : "";
      const assetSuffix = msg.content.assets
        ? `\n\n${formatActiveAssetsManifest(msg.content.assets)}`
        : "";
      fallbackMessages.push({
        role: "assistant",
        content: `${capped}${truncationNote}${actionSuffix}${assetSuffix}`,
      });
    } else {
      fallbackMessages.push({
        role: m.role as "user" | "assistant" | "system",
        content: msg.content.text,
      });
    }
  }

  const fallbackActiveAssetManifest = manifest ? `${manifest}\n\n` : "";

  fallbackMessages.push({
    role: "user",
    content: `${fallbackActiveAssetManifest}${currentMessage}`,
  });

  return fallbackMessages;
}
