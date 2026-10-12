"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useThreadStore } from "@/store/thread.store";
import { useThreadMessageStore } from "@/store/thread.message.store";
import { useAgentStore } from "@/store/agent.store";
import { useChatStream } from "@/hooks/use.chat.stream";
import { ThreadMessage } from "@/lib/repositories/types/thread.message.types";

import { ChatHeader } from "./chat.header";
import { ChatEmptyState } from "./chat.empty.state";
import { ChatMessageCluster } from "./chat.message.cluster";
import { ChatThinkingSteps, ThinkingStep } from "./chat.thinking.steps";
import { ChatInputForm, ActiveUiAction } from "./chat.input.form";

const EMPTY_MESSAGES: ThreadMessage[] = [];

const DEFAULT_THINKING_STEP: ThinkingStep[] = [
  {
    id: "step_init_placeholder",
    title: "Analyzing request",
    subtitle: "Evaluating task requirements & preparing response",
    status: "running",
  },
];

export function MainChat({
  initialMessages = EMPTY_MESSAGES,
}: {
  initialMessages?: ThreadMessage[];
}) {
  const params = useParams();
  const threadId = params?.id as string | undefined;

  const { activeThreadId, setActiveThreadId } = useThreadStore();
  const currentId = threadId || activeThreadId;

  const { messagesByThread, setMessages } = useThreadMessageStore();
  const messages = currentId
    ? messagesByThread[currentId] ||
      (currentId === threadId ? initialMessages : EMPTY_MESSAGES)
    : EMPTY_MESSAGES;

  const { stepsByThread } = useAgentStore();
  const steps = currentId ? stepsByThread[currentId] || [] : [];
  const displaySteps = steps.length > 0 ? steps : DEFAULT_THINKING_STEP;

  const [inputValue, setInputValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  const { streamTurn, isStreaming } = useChatStream();

  useEffect(() => {
    setActiveThreadId(threadId || null);
  }, [threadId, setActiveThreadId]);

  useEffect(() => {
    if (threadId) {
      setMessages(threadId, initialMessages);
    }
  }, [initialMessages, setMessages, threadId]);

  // Detect when user manually scrolls up to prevent auto-scroll hijacking
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distFromBottom > 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll to bottom only when user hasn't manually scrolled up
  useEffect(() => {
    if (userScrolledUpRef.current) return;
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const scrollToBottom = () => {
    userScrolledUpRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleManualSubmit = async (
    e: React.FormEvent | React.KeyboardEvent,
  ) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const userMsgContent = inputValue;
    setInputValue("");
    scrollToBottom();

    await streamTurn(userMsgContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleManualSubmit(e);
    }
  };

  // Parse UI action triggers (e.g. ```ui-action)
  let activeUiAction: ActiveUiAction | null = null;
  const parsedMessages = messages.map((message, index) => {
    let textContent = message.content as string;
    const isLast = index === messages.length - 1;

    if (message.role === "assistant") {
      const match = textContent.match(/```ui-action\n([\s\S]*?)\n```/);
      if (match) {
        textContent = textContent.replace(match[0], "").trim();
        if (isLast && !isStreaming) {
          try {
            activeUiAction = JSON.parse(match[1]);
          } catch (e) {
            console.error("Failed to parse ui-action:", e);
          }
        }
      }
    }
    return { ...message, content: textContent };
  });

  const validMessages = parsedMessages.filter((m, i) => {
    if (m.role === "assistant" && !m.content) {
      return i === parsedMessages.length - 1;
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
        className="flex-1 min-h-0 overflow-y-auto px-6 pt-6"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="max-w-3xl mx-auto pb-6">
          {clusters.map((cluster, clusterIndex) => (
            <ChatMessageCluster
              key={`cluster-${clusterIndex}`}
              cluster={cluster}
            />
          ))}

          {isStreaming &&
            messages.length > 0 &&
            messages[messages.length - 1].role === "user" && (
              <ChatThinkingSteps steps={displaySteps} />
            )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex-shrink-0 p-4 pt-2">
        <ChatInputForm
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSubmit={handleManualSubmit}
          onKeyDown={handleKeyDown}
          isStreaming={isStreaming}
          activeUiAction={activeUiAction}
        />
      </div>
    </div>
  );
}
