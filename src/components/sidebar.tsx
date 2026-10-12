"use client";

import { Input } from "@/components/ui/input";
import React, { useEffect, useState } from "react";
import { useThreadStore } from "@/store/thread.store";
import { useAgentStore } from "@/store/agent.store";

import {
  Plus,
  Search,
  Loader2,
  ExternalLink,
  LogOut,
  CheckCircle2,
  Play,
} from "lucide-react";
import { getThreadsAction } from "@/lib/actions/chat/thread.action";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const { threads, setThreads, activeThreadId, setActiveThreadId } =
    useThreadStore();
  const { streamingThreads } = useAgentStore();

  const [isLoading, setIsLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<{
    connected: boolean;
    orgId: string | null;
  }>({ connected: false, orgId: null });
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isTestingMcp, setIsTestingMcp] = useState(false);

  useEffect(() => {
    async function loadThreads() {
      const res = await getThreadsAction();
      if (res.success && res.data) {
        setThreads(res.data);
      }
      setIsLoading(false);
    }
    loadThreads();

    // Check GrowEasy authentication status
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/groweasy/status");
        if (res.ok) {
          const data = await res.json();
          setAuthStatus(data);
          // Trigger test-mcp so session is synced
          fetch("/api/auth/groweasy/test.mcp").catch(() => {});
        }
      } catch (err) {
        console.error("Failed to check GrowEasy auth status:", err);
      }
    }
    checkAuth();

    // Check query params for OAuth result
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("groweasy_connected")) {
        toast.success("Successfully connected to GrowEasy MCP!");
        checkAuth();
        const url = new URL(window.location.href);
        url.searchParams.delete("groweasy_connected");
        window.history.replaceState(
          {},
          document.title,
          url.pathname + url.search,
        );
      } else if (params.get("groweasy_error")) {
        toast.error(`GrowEasy Auth Failed: ${params.get("groweasy_error")}`);
        const url = new URL(window.location.href);
        url.searchParams.delete("groweasy_error");
        window.history.replaceState(
          {},
          document.title,
          url.pathname + url.search,
        );
      }
    }
  }, [setThreads]);

  const handleConnectGrowEasy = () => {
    setIsAuthLoading(true);
    window.location.href = "/api/auth/groweasy/login";
  };

  const handleDisconnectGrowEasy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch("/api/auth/groweasy/status", { method: "POST" });
      setAuthStatus({ connected: false, orgId: null });
      toast.info("Disconnected from GrowEasy");
    } catch (err) {
      console.error("Failed to disconnect:", err);
    }
  };

  const handleTestMcp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTestingMcp(true);
    try {
      const res = await fetch("/api/auth/groweasy/test.mcp");
      const data = await res.json();
      console.log("GrowEasy MCP Test Results:", data);
      if (data.results?.tools?.ok) {
        const toolsList = data.results.tools.data?.result?.tools || [];
        toast.success(`MCP Active! ${toolsList.length} tools available.`);
      } else {
        const errMsg = JSON.stringify(
          data.results?.tools?.data || data.error || "error",
        );
        toast.info(`MCP Test: ${errMsg.slice(0, 100)}`);
      }
    } catch (err: unknown) {
      console.error(err);
      toast.error("MCP test request failed");
    } finally {
      setIsTestingMcp(false);
    }
  };

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
      <div
        className="flex-1 px-2 overflow-y-auto"
        style={{ overscrollBehavior: "contain" }}
      >
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
              const avatarIndex =
                parseInt(thread.id.substring(0, 8), 16) % botAvatars.length;
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
                        backgroundImage:
                          "linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.05), rgba(52, 211, 153, 0.25), rgba(52, 211, 153, 0.05), transparent)",
                        backgroundSize: "200% 100%",
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

      {/* GrowEasy MCP Connection Profile */}
      <div className="p-3 mt-auto border-t border-zinc-800">
        {authStatus.connected ? (
          <div className="group relative flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-medium text-white font-gothic">
                  GE
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-1.5">
                  <span className="font-display font-medium text-xs text-zinc-100 truncate">
                    GrowEasy MCP
                  </span>
                  <CheckCircle2
                    size={12}
                    className="text-zinc-400 flex-shrink-0"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 truncate font-mono">
                  Org: {authStatus.orgId?.slice(0, 10)}...
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-0.5 flex-shrink-0">
              <button
                onClick={handleTestMcp}
                disabled={isTestingMcp}
                title="Test GrowEasy MCP Tools"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                {isTestingMcp ? (
                  <Loader2 size={13} className="animate-spin text-zinc-300" />
                ) : (
                  <Play size={13} />
                )}
              </button>
              <button
                onClick={handleDisconnectGrowEasy}
                title="Disconnect GrowEasy"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleConnectGrowEasy}
            disabled={isAuthLoading}
            className="w-full group flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80 transition-colors text-left"
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-xs font-medium text-zinc-400 font-gothic group-hover:text-zinc-200 group-hover:border-zinc-600 transition-colors">
                  GE
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-display font-medium text-xs text-zinc-300 group-hover:text-white transition-colors block">
                  Connect with GrowEasy
                </span>
                <p className="text-[10px] text-zinc-500 truncate">
                  Click to link MCP data
                </p>
              </div>
            </div>

            {isAuthLoading ? (
              <Loader2 size={13} className="animate-spin text-zinc-400" />
            ) : (
              <ExternalLink
                size={13}
                className="text-zinc-500 group-hover:text-zinc-300 transition-colors"
              />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
