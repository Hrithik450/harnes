import React from "react";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";
import { ImageGallery } from "./chat.image.gallery";
import { ChatVideoPlayer } from "./chat.video.player";
import { ThreadMessage } from "@/lib/repositories/types/thread.message.types";
import { extractMessageText, normalizeMessageContent } from "@/lib/utils";
import type { UiAction, MessageContent } from "@/lib/types";
import { uiActionRegistry } from "./actions";

function isVideoUrl(url?: string, alt?: string): boolean {
  if (!url) return false;
  const cleanUrl = url.split("?")[0].toLowerCase();

  // Known image file extensions are strictly images, never videos
  if (/\.(png|webp|jpe?g|gif|svg|avif|bmp|ico)$/i.test(cleanUrl)) {
    return false;
  }

  // Known video file extensions
  if (/\.(mp4|webm|mov|m4v|ogg|mkv|avi)$/i.test(cleanUrl)) {
    return true;
  }

  // Fallback: only if no file extension exists, check alt text for explicit video keywords
  if (alt && /\b(mp4|video|reel|clip)\b/i.test(alt)) {
    return true;
  }

  return false;
}

type MessageSegment =
  | { type: "markdown"; content: string }
  | { type: "gallery"; images: Array<{ alt: string; src: string }> }
  | { type: "video"; src: string; title: string }
  | { type: "action"; action: UiAction }
  | { type: "loading_action" }
  | { type: "loading_media"; mediaType: "image" | "video" }
  | { type: "action_error"; error: string; raw?: string };

function parseMediaGalleries(
  text: string,
  isStreamingMessage?: boolean,
): MessageSegment[] {
  if (!text || (!text.includes("![") && !text.includes("<video") && !text.includes(".mp4") && !text.includes(".webm") && !text.includes(".mov"))) {
    return text ? [{ type: "markdown", content: text }] : [];
  }

  const mediaRegex =
    /!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^\s)]+)\)|<video[^>]*src=["']([^"']+)["'][^>]*>(?:<\/video>)?|\[([^\]]*)\]\(((?:https?:\/\/|\/)[^\s)]+\.(?:mp4|webm|mov)(?:\?[^\s)]*)?)\)/gi;
  const matches: Array<{
    alt: string;
    src: string;
    index: number;
    length: number;
    isVideo: boolean;
  }> = [];

  let m: RegExpExecArray | null;
  while ((m = mediaRegex.exec(text)) !== null) {
    const src = m[2] || m[3] || m[5];
    const alt = m[1] || m[4] || (m[3] ? "Generated Video" : "Image");
    matches.push({
      alt,
      src,
      index: m.index,
      length: m[0].length,
      isVideo: Boolean(m[3]) || Boolean(m[5]) || isVideoUrl(src, alt),
    });
  }

  if (matches.length === 0) {
    if (isStreamingMessage) {
      const unclosedImg = text.lastIndexOf("![");
      if (unclosedImg !== -1 && !text.slice(unclosedImg).includes(")")) {
        const safe = text.slice(0, unclosedImg).trim();
        const res: MessageSegment[] = [];
        if (safe) res.push({ type: "markdown", content: safe });
        res.push({ type: "loading_media", mediaType: "image" });
        return res;
      }
      const unclosedVid = text.lastIndexOf("<video");
      if (unclosedVid !== -1 && !text.slice(unclosedVid).includes(">")) {
        const safe = text.slice(0, unclosedVid).trim();
        const res: MessageSegment[] = [];
        if (safe) res.push({ type: "markdown", content: safe });
        res.push({ type: "loading_media", mediaType: "video" });
        return res;
      }
    }
    return [{ type: "markdown", content: text }];
  }

  const segments: MessageSegment[] = [];
  let lastIndex = 0;
  let currentImageGroup: {
    startIndex: number;
    endIndex: number;
    images: Array<{ alt: string; src: string }>;
  } | null = null;

  const flushImageGroup = () => {
    if (currentImageGroup) {
      segments.push({ type: "gallery", images: currentImageGroup.images });
      currentImageGroup = null;
    }
  };

  for (const match of matches) {
    if (match.isVideo) {
      flushImageGroup();

      if (match.index > lastIndex) {
        const subText = text.slice(lastIndex, match.index).trim();
        if (subText) {
          segments.push({ type: "markdown", content: subText });
        }
      }

      segments.push({
        type: "video",
        src: match.src,
        title: match.alt,
      });

      lastIndex = match.index + match.length;
    } else {
      if (!currentImageGroup) {
        if (match.index > lastIndex) {
          const subText = text.slice(lastIndex, match.index).trim();
          if (subText) {
            segments.push({ type: "markdown", content: subText });
          }
        }
        currentImageGroup = {
          startIndex: match.index,
          endIndex: match.index + match.length,
          images: [{ alt: match.alt, src: match.src }],
        };
        lastIndex = match.index + match.length;
      } else {
        const between = text.slice(currentImageGroup.endIndex, match.index);
        if (/^\s*$/.test(between)) {
          currentImageGroup.endIndex = match.index + match.length;
          currentImageGroup.images.push({ alt: match.alt, src: match.src });
          lastIndex = match.index + match.length;
        } else {
          flushImageGroup();
          const subText = text.slice(lastIndex, match.index).trim();
          if (subText) {
            segments.push({ type: "markdown", content: subText });
          }
          currentImageGroup = {
            startIndex: match.index,
            endIndex: match.index + match.length,
            images: [{ alt: match.alt, src: match.src }],
          };
          lastIndex = match.index + match.length;
        }
      }
    }
  }

  flushImageGroup();

  if (lastIndex < text.length) {
    const subText = text.slice(lastIndex).trim();
    if (subText) {
      if (isStreamingMessage) {
        const unclosedImg = subText.lastIndexOf("![");
        if (unclosedImg !== -1 && !subText.slice(unclosedImg).includes(")")) {
          const safe = subText.slice(0, unclosedImg).trim();
          if (safe) segments.push({ type: "markdown", content: safe });
          segments.push({ type: "loading_media", mediaType: "image" });
          return segments;
        }
        const unclosedVid = subText.lastIndexOf("<video");
        if (unclosedVid !== -1 && !subText.slice(unclosedVid).includes(">")) {
          const safe = subText.slice(0, unclosedVid).trim();
          if (safe) segments.push({ type: "markdown", content: safe });
          segments.push({ type: "loading_media", mediaType: "video" });
          return segments;
        }
      }
      segments.push({ type: "markdown", content: subText });
    }
  }

  return segments;
}

function parseMessageContent(
  content: MessageContent | string | null | undefined,
  isStreamingMessage?: boolean,
): MessageSegment[] {
  const normalized = normalizeMessageContent(content);
  const text = normalized.text || "";
  const actionFromObject = normalized.action;

  if (!text && !actionFromObject) {
    return [];
  }

  // Split on XML ui-action blocks: <ui-action> ... </ui-action>
  const uiActionRegex = /<ui-action>\s*([\s\S]*?)\s*<\/ui-action>/g;
  const segments: MessageSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = uiActionRegex.exec(text)) !== null) {
    const preText = text.slice(lastIndex, match.index).trim();
    if (preText) {
      segments.push(...parseMediaGalleries(preText, isStreamingMessage));
    }

    let parsedJson: Record<string, unknown> | null = null;
    let jsonStr = match[1];
    let matchedLength = match[0].length;

    try {
      parsedJson = JSON.parse(jsonStr);
    } catch {
      // Lookahead recovery: what if match was cut short?
      let searchPos = match.index + matchedLength;
      while (searchPos < text.length) {
        const nextClosingIdx = text.indexOf("</ui-action>", searchPos);
        if (nextClosingIdx === -1) break;
        const candidateRaw = text.slice(match.index + 11, nextClosingIdx);
        try {
          const candidate = JSON.parse(candidateRaw.trim());
          if (candidate && typeof candidate === "object") {
            parsedJson = candidate;
            matchedLength = nextClosingIdx + 12 - match.index;
            jsonStr = candidateRaw;
            break;
          }
        } catch {
          searchPos = nextClosingIdx + 12;
        }
      }
    }

    if (parsedJson && typeof parsedJson === "object" && parsedJson.type) {
      segments.push({
        type: "action",
        action: {
          type: String(parsedJson.type),
          id: (parsedJson.id as string) || `action_${match.index}`,
          payload: parsedJson,
          state: (parsedJson.values
            ? {
                ...(typeof parsedJson.state === "object" && parsedJson.state
                  ? (parsedJson.state as Record<string, unknown>)
                  : {}),
                values: parsedJson.values,
              }
            : parsedJson.state) as Record<string, unknown> | undefined,
        },
      });
    } else if (isStreamingMessage) {
      // During active streaming, do NOT flash a red error banner!
      // The JSON block might still be catching up, being typed, or receiving trailing tokens.
      segments.push({ type: "loading_action" });
    } else {
      console.error(
        "[ChatMessageCluster:ActionParse:Error] Failed to parse closed <ui-action> block:",
        jsonStr,
      );
      segments.push({
        type: "action_error",
        error: "Malformed UI action payload: missing valid JSON or action type",
        raw: jsonStr,
      });
    }

    lastIndex = match.index + matchedLength;
  }

  if (lastIndex < text.length) {
    const postText = text.slice(lastIndex);
    // If the remaining text contains an in-progress/unclosed <ui-action> block
    const unclosedIdx = postText.indexOf("<ui-action");
    if (unclosedIdx !== -1) {
      const safeText = postText.slice(0, unclosedIdx).trim();
      if (safeText) {
        segments.push(...parseMediaGalleries(safeText, isStreamingMessage));
      }
      // Render sleek loading placeholder so in-progress raw JSON is never leaked to markdown
      segments.push({ type: "loading_action" });
    } else {
      const trimmed = postText.trim();
      if (trimmed) {
        segments.push(...parseMediaGalleries(trimmed, isStreamingMessage));
      }
    }
  }

  // If action was provided directly in message object and not in text
  const hasActionSegment = segments.some((s) => s.type === "action");
  if (actionFromObject && !hasActionSegment) {
    segments.push({
      type: "action",
      action: actionFromObject,
    });
  }

  // If structured assets exist on the message but were not already parsed from markdown embeds
  if (normalized.assets) {
    if (normalized.assets.type === "image") {
      const hasGallery = segments.some((s) => s.type === "gallery");
      if (!hasGallery && normalized.assets.variants?.length) {
        segments.push({
          type: "gallery",
          images: normalized.assets.variants.map((v) => ({
            alt: v.id || "Variant",
            src: v.image.url,
          })),
        });
      }
    } else if (normalized.assets.type === "video") {
      const hasVideo = segments.some((s) => s.type === "video");
      if (!hasVideo && normalized.assets.master_video?.url) {
        segments.push({
          type: "video",
          src: normalized.assets.master_video.url,
          title: "Video Ad Deliverable",
        });
      }
    }
  }

  return segments.length > 0 ? segments : [{ type: "markdown", content: text }];
}

interface ChatMessageClusterProps {
  cluster: {
    role: string;
    messages: ThreadMessage[];
  };
  onActionComplete?: (
    message: ThreadMessage,
    state: Record<string, unknown>,
    responseText: string,
  ) => Promise<void> | void;
  isStreaming?: boolean;
}

const markdownComponents = {
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const src = (props.src as string) || "";
    if (isVideoUrl(src, props.alt)) {
      return (
        <ChatVideoPlayer
          src={src}
          title={props.alt || "Generated Video"}
        />
      );
    }
    return (
      <ImageGallery
        images={[
          {
            src,
            alt: props.alt || "",
          },
        ]}
      />
    );
  },
  video: (props: React.VideoHTMLAttributes<HTMLVideoElement>) => {
    const src = (props.src as string) || "";
    return <ChatVideoPlayer src={src} title="Generated Video" />;
  },
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const href = (props.href as string) || "";
    const childrenText = typeof props.children === "string" ? props.children : "";
    if (isVideoUrl(href, childrenText)) {
      return (
        <span className="block my-2">
          <ChatVideoPlayer src={href} title={childrenText || "Generated Video"} />
        </span>
      );
    }
    return (
      <a
        {...props}
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-400 hover:text-amber-300 underline underline-offset-2"
      />
    );
  },
};

export function ChatMessageCluster({
  cluster,
  onActionComplete,
  isStreaming,
}: ChatMessageClusterProps) {
  return (
    <div
      className="flex flex-col mb-6"
      style={{ gap: cluster.role === "user" ? "4px" : "16px" }}
    >
      {cluster.messages.map((message, indexInCluster) => {
        const isStreamingThisMessage =
          isStreaming &&
          message.role === "assistant" &&
          (message.id.startsWith("temp-assistant-") ||
            indexInCluster === cluster.messages.length - 1);
        const groupedWithPrevious = indexInCluster > 0;
        const groupedWithNext = indexInCluster < cluster.messages.length - 1;

        return (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : ""}`}
          >
            {message.role === "assistant" ? (
              <div className="py-0.5 text-[15px] leading-normal text-zinc-200 max-w-full font-gothic prose prose-invert prose-p:my-1 prose-p:leading-relaxed prose-headings:my-1.5 prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-[15px] prose-h3:mt-2 prose-h3:mb-1 prose-h4:text-[15px] prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-li:p-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-hr:my-3 prose-hr:border-zinc-800/50 prose-pre:border-none prose-pre:bg-zinc-800/30 prose-pre:overflow-x-auto prose-pre:max-w-full prose-code:border-none prose-code:bg-transparent prose-img:m-0 prose-img:border-none prose-video:m-0 prose-video:border-none prose-table:block prose-table:overflow-x-auto prose-table:border-none border-none break-words [overflow-wrap:anywhere]">
                {parseMessageContent(
                  message.content,
                  isStreamingThisMessage,
                ).map((segment, segIdx) => {
                  if (segment.type === "gallery") {
                    return (
                      <ImageGallery
                        key={`gallery-${message.id}-${segIdx}`}
                        images={segment.images}
                      />
                    );
                  }

                  if (segment.type === "video") {
                    return (
                      <ChatVideoPlayer
                        key={`video-${message.id}-${segIdx}`}
                        src={segment.src}
                        title={segment.title}
                      />
                    );
                  }

                  if (segment.type === "action_error") {
                    return (
                      <div
                        key={`action-error-${message.id}-${segIdx}`}
                        className="my-3 w-full max-w-xl rounded-xl border border-red-500/30 bg-red-950/20 p-3.5 text-red-300 font-gothic flex items-start gap-2.5 text-xs"
                      >
                        <div className="mt-0.5 text-red-400 font-bold">⚠️</div>
                        <div className="flex-1">
                          <p className="font-semibold text-red-200">Interactive Action Error</p>
                          <p className="mt-0.5 text-red-400/80">{segment.error}</p>
                        </div>
                      </div>
                    );
                  }

                  if (segment.type === "action") {
                    const actionEntry = uiActionRegistry[segment.action.type];
                    if (!actionEntry) {
                      console.error(
                        `[ChatMessageCluster:UnknownAction] Unknown action type "${segment.action.type}" in payload:`,
                        segment.action,
                      );
                      return (
                        <div
                          key={`action-unknown-${message.id}-${segment.action.id || segIdx}`}
                          className="my-3 w-full max-w-xl rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-amber-300 font-gothic flex items-start gap-2.5 text-xs"
                        >
                          <div className="mt-0.5 text-amber-400 font-bold">⚠️</div>
                          <div className="flex-1">
                            <p className="font-semibold text-amber-200">Unsupported Action</p>
                            <p className="mt-0.5 text-amber-400/80">
                              Action type &quot;{segment.action.type}&quot; is not registered.
                            </p>
                          </div>
                        </div>
                      );
                    }
                    const ActionComponent = actionEntry.component;

                    return (
                      <ActionComponent
                        key={`action-${message.id}-${segment.action.id || segIdx}`}
                        messageId={message.id}
                        id={segment.action.id}
                        payload={segment.action.payload}
                        state={segment.action.state}
                        isStreaming={isStreaming}
                        onComplete={(actionState, responseText) => {
                          if (onActionComplete) {
                            return onActionComplete(
                              message,
                              actionState,
                              responseText,
                            );
                          }
                        }}
                      />
                    );
                  }

                  if (segment.type === "loading_action") {
                    return (
                      <div
                        key={`loading-action-${message.id}-${segIdx}`}
                        className="my-3 w-full max-w-xl rounded-xl border border-zinc-800 bg-[#1e1e1e] p-4 text-zinc-400 font-gothic animate-pulse flex items-center gap-2.5 text-xs"
                      >
                        <div className="h-3 w-3 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin" />
                        <span>Preparing options...</span>
                      </div>
                    );
                  }

                  if (segment.type === "loading_media") {
                    return (
                      <div
                        key={`loading-media-${message.id}-${segIdx}`}
                        className="my-3 w-full max-w-sm rounded-xl border border-zinc-800 bg-[#1e1e1e] p-3.5 text-zinc-400 font-gothic animate-pulse flex items-center gap-2.5 text-xs"
                      >
                        <div className="h-3 w-3 rounded-full border-2 border-zinc-500 border-t-transparent animate-spin flex-shrink-0" />
                        <span>
                          Loading {segment.mediaType === "video" ? "video" : "image"}...
                        </span>
                      </div>
                    );
                  }

                  return (
                    <ReactMarkdown
                      key={`md-${message.id}-${segIdx}`}
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {segment.content}
                    </ReactMarkdown>
                  );
                })}
              </div>
            ) : (
              <div className="relative group max-w-[88%] sm:max-w-[75%]">
                <div
                  className="bg-[#e4e4e4] text-zinc-900 px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-[15px] font-gothic break-words [overflow-wrap:anywhere]"
                  style={{
                    borderTopLeftRadius: "24px",
                    borderBottomLeftRadius: "24px",
                    borderTopRightRadius: groupedWithPrevious ? "4px" : "24px",
                    borderBottomRightRadius: groupedWithNext ? "4px" : "24px",
                  }}
                >
                  {extractMessageText(message.content)}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
