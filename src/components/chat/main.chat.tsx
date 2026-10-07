"use client";

import { useParams } from "next/navigation";
import { useThreadStore } from "@/store/thread.store";
import remarkGfm from "remark-gfm";
import { Plus, Mic, Image as ImageIcon, Pen, Globe, CheckCircle2, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import React, { useEffect, useRef, useState } from "react";
import { useThreadMessageStore } from "@/store/thread.message.store";
import { ThreadMessage } from "@/lib/repositories/types/thread.message.types";
import { useChatStream } from "@/hooks/use.chat.stream";
import { DropdownItem } from "./dropdown.item";
import TextareaAutosize from 'react-textarea-autosize';
import { useAgentStore } from "@/store/agent.store";

const EMPTY_MESSAGES: ThreadMessage[] = [];

export function MainChat({
  initialMessages = EMPTY_MESSAGES,
}: {
  initialMessages?: ThreadMessage[];
}) {
  const params = useParams();
  const threadId = params?.id as string | undefined;
  
  const { activeThreadId, setActiveThreadId, newThread } = useThreadStore();
  const currentId = threadId || activeThreadId;

  const { messagesByThread, setMessages } = useThreadMessageStore();
  const messages = currentId
    ? messagesByThread[currentId] || (currentId === threadId ? initialMessages : EMPTY_MESSAGES)
    : EMPTY_MESSAGES;

  const { stepsByThread } = useAgentStore();
  const steps = currentId ? stepsByThread[currentId] || [] : [];

  const [inputValue, setInputValue] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userScrolledUpRef = useRef(false);

  useEffect(() => {
    if (threadId) {
      setActiveThreadId(threadId);
    } else {
      setActiveThreadId(null);
    }
  }, [threadId, setActiveThreadId]);

  const { streamTurn, isStreaming } = useChatStream();

  useEffect(() => {
    if (!newThread && threadId) {
      setMessages(threadId, initialMessages);
    }
  }, [initialMessages, newThread, setMessages, threadId]);

  // Detect when user manually scrolls up so we stop hijacking
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

  // When user sends a new message, always snap to bottom
  const scrollToBottom = () => {
    userScrolledUpRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleManualSubmit = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const userMsgContent = inputValue;
    setInputValue("");
    scrollToBottom();

    await streamTurn(userMsgContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleManualSubmit(e);
    }
  };

  let activeUiAction = null as { type: string; listId: string; message: string } | null;
  const parsedMessages = messages.map((message, index) => {
    let textContent = message.content as string;
    const isLast = index === messages.length - 1;

    if (message.role === "assistant") {
      const match = textContent.match(/```ui-action\n([\s\S]*?)\n```/);
      if (match) {
        textContent = textContent.replace(match[0], "").trim();
        // Only trigger UI action if it's the latest message and not currently streaming
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

  const clusters: { role: string; messages: typeof validMessages }[] = [];
  for (const c of validMessages) {
    const lastCluster = clusters[clusters.length - 1];
    if (!lastCluster || lastCluster.role !== c.role) {
      clusters.push({ role: c.role, messages: [c] });
    } else {
      lastCluster.messages.push(c);
    }
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-[#212121] min-h-0">
        {/* Header */}
        <header className="h-14 flex-shrink-0 flex items-center justify-center border-b border-zinc-800/50 bg-[#212121]/80 backdrop-blur-md z-10 px-4">
          <div className="flex items-center space-x-2">
            <span className="font-display font-medium text-zinc-200">
              Chief 1.5
            </span>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
          <div className="w-full max-w-3xl flex flex-col items-center">
            <h2 className="text-3xl font-display font-medium text-zinc-100 mb-10 text-center">
              Ready when you are.
            </h2>

            <div className="w-full">
              {/* Input Form */}
              <form onSubmit={handleManualSubmit} className="w-full relative mb-8">
                <div className="flex items-end bg-[#2a2a2a] rounded-2xl pl-2 pr-2 py-2 transition-colors">
                  <button
                    type="button"
                    className="p-2 bg-[#333] text-zinc-300 hover:bg-[#444] rounded-xl transition-colors flex-shrink-0"
                  >
                    <Plus size={20} />
                  </button>
                  <TextareaAutosize
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message Chief"
                    maxRows={8}
                    className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none font-gothic text-zinc-200 placeholder:text-zinc-500 shadow-none px-4 py-1.5 text-[16px] resize-none overflow-y-auto"
                    style={{ 
                      boxShadow: "none", 
                      border: "none", 
                      outline: "none",
                      WebkitBoxShadow: "none",
                    }}
                  />
                  <button
                    type={inputValue.trim() ? "submit" : "button"}
                    disabled={isStreaming}
                    className="p-2.5 bg-[#f4f4f5] text-zinc-900 hover:bg-white rounded-xl transition-colors ml-1 flex-shrink-0 disabled:opacity-50"
                  >
                    {inputValue.trim() ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 19V5" />
                        <path d="M5 12l7-7 7 7" />
                      </svg>
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>
                </div>
              </form>

              {/* Action Links */}
              <div className="flex flex-col space-y-6 px-4">
                <button className="flex items-center space-x-4 text-zinc-400 hover:text-zinc-200 transition-colors w-fit group">
                  <ImageIcon
                    size={20}
                    className="group-hover:scale-105 transition-transform"
                  />
                  <span className="text-[15px] font-gothic">
                    Create an image or sticker
                  </span>
                </button>
                <button className="flex items-center space-x-4 text-zinc-400 hover:text-zinc-200 transition-colors w-fit group">
                  <Pen
                    size={20}
                    className="group-hover:scale-105 transition-transform"
                  />
                  <span className="text-[15px] font-gothic">Write or edit</span>
                </button>
                <button className="flex items-center space-x-4 text-zinc-400 hover:text-zinc-200 transition-colors w-fit group">
                  <Globe
                    size={20}
                    className="group-hover:scale-105 transition-transform"
                  />
                  <span className="text-[15px] font-gothic">
                    Search the web
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#212121] min-h-0 overflow-hidden">
      {/* Header — fixed height, never grows */}
      <header className="h-14 flex-shrink-0 flex items-center justify-center border-b border-zinc-800/50 bg-[#212121]/95 backdrop-blur-md z-10 px-4">
        <div className="flex items-center space-x-2">
          <span className="font-display font-medium text-zinc-200">
            Chief 1.5
          </span>
        </div>
      </header>

      {/* Chat History — takes remaining space, scrolls internally */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-6 pt-6"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="max-w-3xl mx-auto pb-6">
          {clusters.map((cluster, clusterIndex) => (
            <div
              key={`cluster-${clusterIndex}`}
              className="flex flex-col mb-6"
              style={{ gap: cluster.role === "user" ? "4px" : "16px" }}
            >
              {cluster.messages.map((message, indexInCluster) => {
                const groupedWithPrevious = indexInCluster > 0;
                const groupedWithNext = indexInCluster < cluster.messages.length - 1;
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : ""}`}
                  >
                    {message.role === "assistant" ? (
                      <div className="py-0.5 text-[15px] leading-normal text-zinc-200 max-w-full font-gothic prose prose-invert prose-p:my-1 prose-p:leading-relaxed prose-headings:my-1.5 prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-[15px] prose-h3:mt-2 prose-h3:mb-1 prose-h4:text-[15px] prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-li:p-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-hr:my-3 prose-hr:border-zinc-800/50 prose-pre:border-none prose-pre:bg-zinc-800/30 prose-code:border-none prose-code:bg-transparent prose-img:border-none prose-table:border-none border-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.content as string}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="relative group max-w-[75%]">
                        <div 
                          className="bg-[#e4e4e4] text-zinc-900 px-5 py-2.5 text-[15px] font-gothic break-words"
                          style={{
                            borderTopLeftRadius: "24px",
                            borderBottomLeftRadius: "24px",
                            borderTopRightRadius: groupedWithPrevious ? "4px" : "24px",
                            borderBottomRightRadius: groupedWithNext ? "4px" : "24px",
                          }}
                        >
                          {message.content as string}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {(isStreaming && messages.length > 0) && (
            messages[messages.length - 1].role === "user" || steps.some(step => step.status === "running")
          ) && (
              <div className="flex flex-col mb-4 py-2 px-3 md:px-2 w-full max-w-full transition-all duration-200">
                <div className="flex items-center space-x-3 mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/bot/chief-animated.svg"
                    alt="Thinking"
                    className="w-5 h-5 opacity-90"
                  />
                  <span className="font-display font-medium bg-gradient-to-r from-zinc-300 to-zinc-500 bg-clip-text text-transparent animate-pulse tracking-wide">
                    Chief is thinking...
                  </span>
                </div>
                
                {steps.length > 0 && (
                  <div className="relative max-h-48 overflow-y-auto pr-1 flex flex-col ml-8 mt-1">
                    {steps.map((step, idx) => {
                      const isLast = idx === steps.length - 1;
                      const isRunning = step.status === "running" || (isLast && !step.status);
                      const isFailed = step.status === "failed";
                      const isCompleted = step.status === "completed";

                      return (
                        <div
                          key={step.id || `step-${idx}`}
                          className={`relative flex items-stretch gap-2.5 text-[13px] font-gothic transition-all duration-300 ${isRunning ? "opacity-100" : "opacity-75"}`}
                        >
                          <div className="relative flex flex-col items-center shrink-0 w-3.5">
                            <div className="z-10 mt-0.5 flex h-3.5 w-3.5 items-center justify-center">
                              {isRunning ? (
                                <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
                              ) : isFailed ? (
                                <div className="h-2 w-2 rounded-full bg-red-500" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="h-3 w-3 text-zinc-500" />
                              ) : (
                                <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                              )}
                            </div>
                            {!isLast && (
                              <div
                                className="w-px flex-1 my-0.5 min-h-[14px]"
                                style={{ backgroundColor: "rgba(161, 161, 170, 0.2)" }}
                              />
                            )}
                          </div>
                          <div className={`flex flex-col min-w-0 flex-1 leading-snug ${!isLast ? "pb-2.5" : "pb-0.5"}`}>
                            <span className={`${isRunning ? "text-zinc-300 font-medium" : "text-zinc-500"}`}>
                              {step.title}
                            </span>
                            {step.subtitle && (
                              <span className="text-[12px] text-zinc-500 mt-0.5">
                                {step.subtitle}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Area — fixed at bottom, never grows */}
      <div className="flex-shrink-0 p-4 pt-2">
        <form
          onSubmit={handleManualSubmit}
          className="w-full max-w-3xl mx-auto relative"
        >
          {activeUiAction?.type === "dropdown" && (
            <DropdownItem
              listId={activeUiAction.listId}
              message={activeUiAction.message}
              onSelect={(val) => {
                setInputValue(val);
                // Optionally focus input or submit directly.
                // We just set the value so user can click send.
              }}
            />
          )}

          <div className="flex items-end bg-[#2a2a2a] rounded-2xl pl-2 pr-2 py-2 transition-colors">
            <button
              type="button"
              className="p-2 bg-[#333] text-zinc-300 hover:bg-[#444] rounded-xl transition-colors flex-shrink-0"
            >
              <Plus size={20} />
            </button>
            <TextareaAutosize
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Chief"
              maxRows={8}
              className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none font-gothic text-zinc-200 placeholder:text-zinc-500 shadow-none px-4 py-1.5 text-[15px] resize-none overflow-y-auto"
              style={{ 
                boxShadow: "none", 
                border: "none", 
                outline: "none",
                WebkitBoxShadow: "none",
              }}
            />
            <button
              type={inputValue.trim() ? "submit" : "button"}
              disabled={isStreaming}
              className="p-2.5 bg-[#f4f4f5] text-zinc-900 hover:bg-white rounded-xl transition-colors ml-1 flex-shrink-0 disabled:opacity-50"
            >
              {inputValue.trim() ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 19V5" />
                  <path d="M5 12l7-7 7 7" />
                </svg>
              ) : (
                <Mic size={18} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
