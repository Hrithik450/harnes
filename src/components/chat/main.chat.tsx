"use client";

import { useParams } from "next/navigation";
import { useThreadStore } from "@/store/thread.store";
import React, { useEffect, useRef, useState } from "react";
import { useThreadMessageStore } from "@/store/thread.message.store";
import { useUserStore } from "@/store/user.store";
import {
  useChatStream,
  persistAssistantMessage,
} from "@/hooks/use.chat.stream";
import { ThreadMessage } from "@/lib/repositories/types/thread.message.types";
import { toast } from "sonner";
import {
  isMessageHidden,
  injectActionStateIntoMarkdown,
  normalizeMessageContent,
} from "@/lib/utils";
import type { MessageContent } from "@/lib/types";
import { ChatHeader } from "./chat.header";
import { ChatEmptyState } from "./chat.empty.state";
import { ChatMessageCluster } from "./chat.message.cluster";
import { ChatInputForm } from "./chat.input.form";
import { ChiefThinking } from "./chief.thinking";

const EMPTY_MESSAGES: ThreadMessage[] = [];

export function MainChat({
  initialMessages = EMPTY_MESSAGES,
}: {
  initialMessages?: ThreadMessage[];
}) {
  const params = useParams();
  const threadId = params?.id as string | undefined;

  const { activeThreadId, setActiveThreadId } = useThreadStore();
  const currentId = threadId || activeThreadId;

  const { messagesByThread, setMessages, updateMessage } =
    useThreadMessageStore();
  const messages = currentId
    ? messagesByThread[currentId] ||
      (currentId === threadId ? initialMessages : EMPTY_MESSAGES)
    : EMPTY_MESSAGES;

  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const userScrolledUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const isSubmittingRef = useRef(false);
  const isActionCompletingRef = useRef(false);

  const { user } = useUserStore();
  const { streamTurn, stopStream, isStreaming } = useChatStream();

  useEffect(() => {
    if (threadId) {
      setActiveThreadId(threadId);
    }
  }, [threadId, setActiveThreadId]);

  useEffect(() => {
    if (threadId && initialMessages && initialMessages.length > 0) {
      setMessages(threadId, initialMessages);
    }
  }, [initialMessages, setMessages, threadId]);

  // Detect genuine user manual scroll gestures (wheel, touch, pointer) vs content expansion
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let isUserInteracting = false;
    let interactionTimer: ReturnType<typeof setTimeout> | null = null;

    const startInteraction = () => {
      isUserInteracting = true;
      if (interactionTimer != null) clearTimeout(interactionTimer);
      interactionTimer = setTimeout(() => {
        isUserInteracting = false;
      }, 600);
    };

    const onWheel = (e: WheelEvent) => {
      startInteraction();
      // If user wheels upward, mark scrolled up immediately
      if (e.deltaY < 0) {
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distFromBottom > 40) {
          userScrolledUpRef.current = true;
        }
      }
    };

    const onTouchMove = () => {
      startInteraction();
    };

    const onPointerDown = () => {
      startInteraction();
    };

    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

      // When user scrolls back near the bottom, always re-engage auto-scroll lock
      if (distFromBottom <= 40) {
        userScrolledUpRef.current = false;
        lastScrollTopRef.current = el.scrollTop;
        return;
      }

      // Only lock out auto-scroll if the scroll was driven by intentional user interaction
      // AND scrollTop moved upward (away from bottom)
      if (isUserInteracting && el.scrollTop < lastScrollTopRef.current - 5) {
        if (distFromBottom > 80) {
          userScrolledUpRef.current = true;
        }
      }

      lastScrollTopRef.current = el.scrollTop;
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      if (interactionTimer != null) clearTimeout(interactionTimer);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Content resize observer: keep pinned when cards, galleries, or questionnaire elements expand
  useEffect(() => {
    const el = contentRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => {
      if (!userScrolledUpRef.current && scrollRef.current) {
        if (isStreaming) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [isStreaming]);

  // Auto-scroll to bottom only when user hasn't manually scrolled up
  useEffect(() => {
    if (userScrolledUpRef.current) return;
    const el = scrollRef.current;
    if (!el) return;

    if (scrollRafRef.current != null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      if (userScrolledUpRef.current || !scrollRef.current) return;

      if (isStreaming) {
        // Direct assignment pins instantly without animation easing curve or touch locking
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      } else {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    });

    return () => {
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [messages, isStreaming]);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    userScrolledUpRef.current = false;
    if (behavior === "smooth") {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const hasActiveForm = React.useMemo(() => {
    // Check if any assistant message in the thread contains an unsubmitted form
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role !== "assistant") continue;

      const content = normalizeMessageContent(msg.content);

      // 1. Direct action on content
      if (content.action?.type === "form") {
        const state = content.action.state as
          | Record<string, unknown>
          | undefined;
        const payload = content.action.payload as
          | Record<string, unknown>
          | undefined;
        const answered = payload?.values || state?.values;
        if (!answered || Object.keys(answered as object).length === 0) {
          return true;
        }
      }

      // 2. <ui-action> in text
      if (content.text.includes("<ui-action>")) {
        const uiActionRegex = /<ui-action>\s*([\s\S]*?)\s*<\/ui-action>/g;
        let match: RegExpExecArray | null;
        while ((match = uiActionRegex.exec(content.text)) !== null) {
          try {
            const parsed = JSON.parse(match[1]);
            if (parsed.type === "form") {
              const answered = parsed.values || parsed.state?.values;
              if (!answered || Object.keys(answered as object).length === 0) {
                return true;
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
    return false;
  }, [messages]);

  const handleManualSubmit = async (
    e: React.FormEvent | React.KeyboardEvent,
  ) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please login before sending messages");
      return;
    }
    if (hasActiveForm) {
      toast.info("Please complete the form above to continue.");
      return;
    }
    if (!inputValue.trim() || isStreaming || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    try {
      const userMsgContent = inputValue;
      setInputValue("");
      scrollToBottom();

      await streamTurn(userMsgContent);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!e.nativeEvent.isComposing && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasActiveForm) {
        toast.info("Please complete the form above to continue.");
        return;
      }
      if (isStreaming) {
        return;
      }
      handleManualSubmit(e);
    }
  };

  const handleActionComplete = async (
    message: ThreadMessage,
    actionState: Record<string, unknown>,
    responseText: string,
  ) => {
    const targetThreadId = currentId || message.thread_id;
    if (!targetThreadId || isActionCompletingRef.current) return;

    isActionCompletingRef.current = true;
    try {
      // 1. Immediately update the assistant message locally with selected answers
      const currentContent = normalizeMessageContent(message.content);
      const updatedMarkdown = injectActionStateIntoMarkdown(
        currentContent.text,
        actionState,
      );
      const updatedContent: MessageContent = {
        ...currentContent,
        text: updatedMarkdown,
        ...(currentContent.action
          ? {
              action: {
                ...currentContent.action,
                state: {
                  ...(currentContent.action.state || {}),
                  ...actionState,
                },
              },
            }
          : {}),
      };

      updateMessage(targetThreadId, message.id, {
        content: updatedContent,
      });

      // 2. Persist updated assistant message with chosen answers in database BEFORE starting next stream
      // Coordinates safely even if message.id is still a temp ID or save is in flight
      try {
        await persistAssistantMessage(
          targetThreadId,
          message.id,
          updatedContent,
        );
      } catch (err) {
        console.error("Failed to save action state to DB:", err);
      }

      scrollToBottom();

      // 3. Send selected answers to AI without rendering a user bubble in UI
      await streamTurn(responseText, { isHidden: true });
    } finally {
      isActionCompletingRef.current = false;
    }
  };

  const validMessages = messages.filter((m, i) => {
    // Hide messages marked as hidden from visual chat UI (e.g. submitted questionnaire answers)
    if (isMessageHidden(m)) {
      return false;
    }
    if (m.role === "assistant" && !m.content) {
      return i === messages.length - 1;
    }
    return true;
  });

  // Group contiguous messages by role for visual clustering
  const clusters: { role: string; messages: typeof validMessages }[] = [];
  for (const c of validMessages) {
    const lastCluster = clusters[clusters.length - 1];
    if (!lastCluster || lastCluster.role !== c.role) {
      clusters.push({ role: c.role, messages: [c] });
    } else {
      lastCluster.messages.push(c);
    }
  }

  // Empty state view
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-[#212121] min-h-0">
        <ChatHeader className="bg-[#212121]/80" />
        <ChatEmptyState
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSubmit={handleManualSubmit}
          onKeyDown={handleKeyDown}
          isStreaming={isStreaming}
          onStop={stopStream}
        />
      </div>
    );
  }

  // Active chat view
  return (
    <div className="flex-1 flex flex-col bg-[#212121] min-h-0 overflow-hidden">
      <ChatHeader />

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-6 pt-3 sm:pt-6 w-full"
        style={{ overscrollBehavior: "contain", overflowAnchor: "auto" }}
      >
        <div ref={contentRef} className="max-w-3xl mx-auto pb-6 w-full">
          {clusters.map((cluster, clusterIndex) => (
            <ChatMessageCluster
              key={`cluster-${clusterIndex}`}
              cluster={cluster}
              onActionComplete={handleActionComplete}
              isStreaming={isStreaming}
            />
          ))}

          {isStreaming &&
            messages[messages.length - 1]?.role !== "assistant" && (
              <ChiefThinking />
            )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex-shrink-0 p-2 sm:p-4 pt-1 sm:pt-2 safe-bottom w-full">
        <ChatInputForm
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSubmit={handleManualSubmit}
          onKeyDown={handleKeyDown}
          isStreaming={isStreaming}
          onStop={stopStream}
          isBlocked={hasActiveForm}
        />
      </div>
    </div>
  );
}
