"use client";

import { Input } from "@/components/ui/input";
import React, { useEffect, useState } from "react";
import { useThreadStore } from "@/store/thread.store";
import { useAgentStore } from "@/store/agent.store";
import { useUserStore } from "@/store/user.store";

import { Plus, Search, LogOut, MessageSquare, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSidebarStore } from "@/store/sidebar.store";
import type { Thread } from "@/lib/repositories/types/thread.types";
import type { UserRecord } from "@/lib/drizzle/schema";

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

function formatThreadDate(date: Date | string | null | undefined): string {
  if (!date) return "Default Agent";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "Default Agent";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function Sidebar({
  initialThreads = [],
  initialUser = null,
}: {
  initialThreads?: Thread[];
  initialUser?: UserRecord | null;
}) {
  const router = useRouter();
  const { threads, setThreads, activeThreadId, setActiveThreadId } =
    useThreadStore();
  const { streamingThreads } = useAgentStore();
  const { user: storeUser, logout } = useUserStore();
  const user = storeUser ?? initialUser;
  const { isMobileOpen, closeMobile } = useSidebarStore();

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialThreads.length > 0 && threads.length === 0) {
      setThreads(initialThreads);
    }
  }, [initialThreads, threads.length, setThreads]);

  useEffect(() => {
    if (!isMobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobile();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobileOpen, closeMobile]);

  const handleThreadClick = (threadId: string) => {
    closeMobile();
    if (!user) {
      toast.error("Please login before accessing conversations");
      return;
    }
    router.push(`/chat/${threadId}`);
  };

  const handleNewChat = () => {
    closeMobile();
    if (!user) {
      toast.error("Please login before starting conversations");
      return;
    }
    setActiveThreadId(null);
    router.push(`/`);
  };

  const displayThreads = threads.length > 0 ? threads : initialThreads;

  const filteredThreads = displayThreads.filter((t) =>
    (t.title || "New Chat").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const defaultThreads = filteredThreads.filter((t) => t.is_default);
  const customThreads = filteredThreads.filter((t) => !t.is_default);

  const renderThreadItem = (thread: Thread) => {
    let avatarSrc = "/bot/chief-animated.svg";
    if (thread.title === "Ad Creative") {
      avatarSrc = "/bot/chief-animated.svg";
    } else if (thread.title === "Ad Strategist") {
      avatarSrc = "/bot/sales-outbound-animated.svg";
    } else {
      const avatarIndex =
        Math.abs(
          thread.id.split("").reduce((acc, char) => {
            return (acc << 5) - acc + char.charCodeAt(0);
          }, 0),
        ) % botAvatars.length;
      avatarSrc = `/bot/${botAvatars[avatarIndex]}`;
    }

    const isStreaming = Boolean(streamingThreads[thread.id]);

    return (
      <div
        key={thread.id}
        onClick={() => handleThreadClick(thread.id)}
        className={`group relative flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all ${
          activeThreadId === thread.id
            ? "bg-[#252525] border border-white/5"
            : "hover:bg-[#1f1f1f]"
        }`}
      >
        {isStreaming && (
          <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden z-20">
            <div
              className="absolute -inset-y-4 -left-1/4 w-[60%] pointer-events-none animate-metal-shine mix-blend-screen"
              style={{
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.03) 20%, rgba(255, 255, 255, 0.16) 40%, rgba(255, 255, 255, 0.42) 50%, rgba(255, 255, 255, 0.16) 60%, rgba(255, 255, 255, 0.03) 80%, transparent 100%)",
              }}
            />
          </div>
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
          <p
            className="text-xs text-zinc-500 truncate mt-0.5"
            suppressHydrationWarning
          >
            {formatThreadDate(thread.updated_at || thread.created_at)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-[84vw] max-w-[310px] md:w-[260px] lg:w-[300px] flex-shrink-0 flex flex-col border-r border-zinc-800 bg-[#161616] h-full transition-transform duration-300 ease-in-out ${
          isMobileOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full md:translate-x-0"
        }`}
        aria-label="Sidebar navigation"
      >
        <div className="flex items-center justify-between md:justify-end px-4 pt-4 pb-2">
          {/* Mobile close button */}
          <button
            onClick={closeMobile}
            className="md:hidden p-1.5 -ml-1 text-zinc-400 hover:text-zinc-100 hover:bg-[#252525] rounded-lg transition-colors"
            title="Close sidebar"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>

          <button
            onClick={handleNewChat}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-[#252525] rounded-lg transition-colors"
            title="New Chat"
            aria-label="New Chat"
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#242424] border-none text-sm pl-9 font-gothic placeholder:text-zinc-500 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-lg h-9"
          />
        </div>
      </div>

      {/* Chat List */}
      <div
        className="flex-1 px-2 overflow-y-auto"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="space-y-1">
          {filteredThreads.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-sm font-gothic">
              {searchQuery ? "No chats found" : "No chats yet"}
            </div>
          ) : (
            <>
              {defaultThreads.map((thread) => renderThreadItem(thread))}

              {customThreads.length > 0 && (
                <div className="pt-3">
                  <div className="px-2 py-1.5 text-[11px] font-semibold tracking-wider uppercase text-zinc-400 font-mono flex items-center gap-1.5">
                    <MessageSquare size={11} className="text-zinc-500" />
                    <span>Recent Chats</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {customThreads.map((thread) => renderThreadItem(thread))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom User / Authentication Section */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/40">
        {user ? (
          <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/70 hover:border-zinc-700 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.picture ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-emerald-500/30 flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-xs flex items-center justify-center flex-shrink-0 ring-1 ring-emerald-500/30">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">
                  {user.name}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                closeMobile();
                logout();
              }}
              title="Sign Out"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <a
            href="/api/auth/google/login"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-[#222222] hover:bg-[#2a2a2a] border border-zinc-700/60 hover:border-zinc-600 text-zinc-200 hover:text-white font-medium text-xs transition-all shadow-sm"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </a>
        )}
      </div>
    </aside>
  </>
  );
}
