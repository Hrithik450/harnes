"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  CheckCircle2,
  Plus,
  Loader2,
  SlidersHorizontal,
  MoreVertical,
  LogOut,
  Settings2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useConnectorStore } from "@/store/connector.store";
import { CONNECTOR_CONFIG_MODALS } from "./config.registry";

interface ConnectorItem {
  id: string;
  name: string;
  author: string;
  description: string;
  icon: string;
  isAvailable: boolean;
  comingSoon?: boolean;
  connected: boolean;
  metadata?: Record<string, unknown> | null;
}

export function ConnectorsModal() {
  const {
    isModalOpen,
    closeModal,
    openConfig,
    closeConfig,
    activeConfigProvider,
  } = useConnectorStore();

  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const loadConnectors = async () => {
    try {
      const res = await fetch("/api/connectors");
      if (res.ok) {
        const data = await res.json();
        setConnectors(data.connectors || []);
      }
    } catch {
      console.error("Failed to load connectors");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      loadConnectors();
    }
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const handleConnect = (id: string) => {
    const currentPath =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/";
    const returnTo = encodeURIComponent(currentPath);
    if (id === "groweasy") {
      window.location.href = `/api/auth/groweasy/login?return_to=${returnTo}`;
    } else if (id === "google_gmb") {
      window.location.href = `/api/auth/gmb/login?return_to=${returnTo}`;
    } else {
      toast.info(`${id} integration coming soon`);
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      const res = await fetch("/api/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", provider: id }),
      });
      if (res.ok) {
        toast.info("Disconnected successfully");
        setActiveMenuId(null);
        loadConnectors();
      }
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const filtered = connectors.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const ActiveConfigDialog = activeConfigProvider
    ? CONNECTOR_CONFIG_MODALS[activeConfigProvider]
    : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 p-4">
        <div className="w-full max-w-5xl h-[620px] bg-[#212121] border border-zinc-800 rounded-2xl shadow-2xl flex overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-56 bg-[#161616] border-r border-zinc-800 p-4 flex flex-col justify-between flex-shrink-0">
            <div>
              <div className="px-2 py-1 mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 font-gothic">
                  Integrations
                </span>
              </div>
              <div className="space-y-1">
                <button className="w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-xl bg-[#2a2a2a] border border-zinc-700/60 text-zinc-100 text-sm font-medium font-display transition-colors">
                  <SlidersHorizontal size={15} className="text-zinc-400" />
                  <span>Connectors</span>
                </button>
              </div>
            </div>

            <div className="px-2 py-3 border-t border-zinc-800">
              <p className="text-[11px] text-zinc-500 font-gothic leading-relaxed">
                Connected channels allow Chief to automate festive posts,
                reviews, and campaigns.
              </p>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#212121]">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-medium text-zinc-100 font-display">
                  Connectors
                </h2>
              </div>

              <div className="flex items-center space-x-3">
                <div className="relative w-56">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search connectors"
                    className="w-full bg-[#161616] border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700 font-gothic"
                  />
                </div>
                <button
                  onClick={closeModal}
                  className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Connectors Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {isLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm font-gothic">
                  <p>No connectors match your search.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {filtered.map((connector) => {
                    const isGmb = connector.id === "google_gmb";
                    const isGe = connector.id === "groweasy";
                    const hasCustomConfig = Boolean(
                      CONNECTOR_CONFIG_MODALS[connector.id],
                    );

                    return (
                      <div
                        key={connector.id}
                        className={`relative group rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                          connector.connected
                            ? "bg-[#282828] border-zinc-600/80 shadow-sm"
                            : "bg-[#2a2a2a] border-zinc-700/60 hover:border-zinc-500/80 hover:bg-[#2e2e2e]"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              {/* Connector Icon Box */}
                              <div className="h-10 w-10 rounded-xl bg-[#1e1e1e] border border-zinc-700/80 flex items-center justify-center flex-shrink-0 text-zinc-200 font-gothic">
                                {isGe && (
                                  <span className="font-bold text-xs tracking-wider text-zinc-200">
                                    GE
                                  </span>
                                )}
                                {isGmb && (
                                  <svg
                                    className="h-5 w-5"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                  >
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
                                )}
                                {!isGe && !isGmb && (
                                  <span className="font-semibold text-xs text-zinc-400">
                                    {connector.name.slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <h4 className="text-[15px] font-medium text-zinc-100 font-display">
                                    {connector.name}
                                  </h4>
                                  <CheckCircle2
                                    size={13}
                                    className="text-zinc-400"
                                  />
                                </div>
                                <span className="text-[11px] text-zinc-500 font-gothic">
                                  by {connector.author}
                                </span>
                              </div>
                            </div>

                            {/* Action Button */}
                            {connector.connected ? (
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setActiveMenuId(
                                      activeMenuId === connector.id
                                        ? null
                                        : connector.id,
                                    )
                                  }
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-[#333] transition-colors"
                                >
                                  <MoreVertical size={14} />
                                </button>

                                {activeMenuId === connector.id && (
                                  <div className="absolute right-0 top-8 z-30 w-44 bg-[#2a2a2a] border border-zinc-700/80 rounded-xl shadow-2xl py-1 text-xs text-zinc-300 font-gothic">
                                    {hasCustomConfig && (
                                      <button
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          openConfig(connector.id);
                                        }}
                                        className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-[#333] hover:text-white transition-colors text-left"
                                      >
                                        <Settings2 size={13} />
                                        <span>Manage</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() =>
                                        handleDisconnect(connector.id)
                                      }
                                      className="w-full flex items-center space-x-2 px-3 py-2 text-zinc-400 hover:text-red-400 hover:bg-[#333] transition-colors text-left"
                                    >
                                      <LogOut size={13} />
                                      <span>Disconnect</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : connector.comingSoon ? (
                              <span className="px-2 py-0.5 text-[10px] bg-[#1e1e1e] text-zinc-400 border border-zinc-700/60 rounded-lg font-mono">
                                Soon
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConnect(connector.id)}
                                className="h-8 w-8 rounded-xl bg-[#333] hover:bg-[#444] text-zinc-200 border border-zinc-700/60 flex items-center justify-center transition-colors"
                                title={`Connect ${connector.name}`}
                              >
                                <Plus size={16} />
                              </button>
                            )}
                          </div>

                          <p className="text-xs text-zinc-400 mt-3 line-clamp-2 leading-relaxed font-gothic">
                            {connector.description}
                          </p>
                        </div>

                        {/* Status Footer */}
                        <div className="mt-4 pt-3 border-t border-zinc-700/60 flex items-center justify-between text-[11px] font-gothic">
                          {connector.connected ? (
                            <div className="flex items-center space-x-1.5 text-zinc-300 font-medium">
                              <Check
                                size={13}
                                className="text-zinc-200 flex-shrink-0"
                              />
                              <span>Connected</span>
                            </div>
                          ) : (
                            <span className="text-zinc-500">Not connected</span>
                          )}

                          {connector.connected && hasCustomConfig && (
                            <button
                              onClick={() => openConfig(connector.id)}
                              className="text-xs text-zinc-400 hover:text-zinc-100 underline decoration-zinc-600 transition-colors"
                            >
                              Manage
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {ActiveConfigDialog && (
        <ActiveConfigDialog
          isOpen={Boolean(activeConfigProvider)}
          onClose={closeConfig}
          onConfigSaved={() => loadConnectors()}
        />
      )}
    </>
  );
}
