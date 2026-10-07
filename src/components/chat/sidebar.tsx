"use client";

import { Input } from "@/components/ui/input";
import React, { useEffect, useState } from "react";
import { useThreadStore } from "@/store/thread.store";
import { useAgentStore } from "@/store/agent.store";

import { Plus, Search, Loader2 } from "lucide-react";
import { getThreadsAction } from "@/lib/actions/chat/thread.action";
import { useRouter } from "next/navigation";

const botAvatars = [
  "chief-animated.svg",
  "sales-outbound-animated.svg",
  "inbox-manager-animated.svg",
  "account-manager-animated.svg",
  "talent-scout-animated.svg",
  "expense-manager-animated.svg",
  "offsite-crew-animated.svg",
  "grok-bot-animated.svg",
];

export function Sidebar() {
  const router = useRouter();
  const { threads, setThreads, activeThreadId, setActiveThreadId } = useThreadStore();
  const { streamingThreads } = useAgentStore();

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadThreads() {
      const res = await getThreadsAction();
      if (res.success && res.data) {
        setThreads(res.data);
      }
      setIsLoading(false);
    }
    loadThreads();
  }, [setThreads]);

  const handleThreadClick = (threadId: string) => {
    router.push(`/chat/${threadId}`);
  };

  const handleNewChat = () => {
    setActiveThreadId(null);
    router.push(`/`);
  };

  return (
    <div className="w-[300px] flex-shrink-0 flex flex-col border-r border-zinc-800 bg-[#161616]">
      <div className="flex items-center justify-end px-4 pt-4 pb-2">
        <button
          onClick={handleNewChat}
          className="text-zinc-400 hover:text-zinc-100 transition-colors"
          title="New Chat"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search"
            className="w-full bg-[#242424] border-none text-sm pl-9 font-gothic placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg h-9"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 px-2 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
        <div className="space-y-1">
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
            </div>
          ) : threads.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-sm font-gothic">
              No chats yet
            </div>
          ) : (
            threads.map((thread) => {
              const avatarIndex = parseInt(thread.id.substring(0, 8), 16) % botAvatars.length;
              const avatarSrc = `/bot/${botAvatars[avatarIndex]}`;
              
              return (
              <div
                key={thread.id}
                onClick={() => handleThreadClick(thread.id)}
                className={`relative overflow-hidden flex items-center space-x-3 p-2 rounded-xl cursor-pointer transition-colors ${
                  activeThreadId === thread.id
                    ? "bg-[#2a2a2a]"
                    : "hover:bg-[#242424]"
                }`}
              >
                {streamingThreads[thread.id] && (
                  <div 
                    className="absolute inset-0 pointer-events-none animate-shimmer"
                    style={{
                      backgroundImage: "linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.05), rgba(52, 211, 153, 0.25), rgba(52, 211, 153, 0.05), transparent)",
                      backgroundSize: "200% 100%"
                    }}
                  />
                )}
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={avatarSrc}
                    alt={thread.title ?? "Chat"}
                    className="h-10 w-10 object-contain relative z-10"
                  />
                </div>
                <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-display font-medium text-[15px] truncate ${
                        activeThreadId === thread.id
                          ? "text-white"
                          : "text-zinc-300"
                      }`}
                    >
                      {thread.title || "New Chat"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {new Date(
                      thread.updated_at || thread.created_at || Date.now(),
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-3 mt-auto border-t border-zinc-800">
        <div className="flex items-center space-x-3 p-1 rounded-xl cursor-pointer hover:bg-[#242424] transition-colors">
          <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300 font-gothic">
            AS
          </div>
          <span className="font-display font-medium text-sm text-zinc-200">
            Armand Segall
          </span>
        </div>
      </div>
    </div>
  );
}
