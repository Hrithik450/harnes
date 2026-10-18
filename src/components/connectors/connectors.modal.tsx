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
import { useUserStore } from "@/store/user.store";
import { ConnectorManageModal, ConnectorItem } from "./connector.manage.modal";

export function ConnectorsModal() {
  const { isModalOpen, closeModal, activeConfigProvider, closeConfig } =
    useConnectorStore();
  const { user } = useUserStore();

  const [connectors, setConnectors] = useState<ConnectorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [manageConnector, setManageConnector] = useState<ConnectorItem | null>(
    null,
  );

  useEffect(() => {
    if (isModalOpen) {
      loadConnectors();
    }
  }, [isModalOpen]);

  useEffect(() => {
    if (activeConfigProvider && connectors.length > 0) {
      const target = connectors.find((c) => c.id === activeConfigProvider);
      if (target) {
        setManageConnector(target);
      }
    }
  }, [activeConfigProvider, connectors]);

  if (!isModalOpen) return null;

  const loadConnectors = async () => {
    try {
      const res = await fetch("/api/connectors");
      if (res.ok) {
        const data = await res.json();
        setConnectors(data.connectors || []);
      }
    } catch (err) {
      console.error("[ConnectorsModal:LoadConnectors:Error] Failed to load connectors:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = (id: string) => {
    if (!user) {
      toast.error("Please login before connecting connectors");
      return;
    }

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
    } catch (err) {
      console.error("[ConnectorsModal:Disconnect:Error] Failed to disconnect connector:", err);
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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-2.5 sm:p-4">
        <div className="w-full max-w-4xl bg-[#1e1e1e] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col h-[90dvh] sm:h-[700px] max-h-[90dvh] overflow-hidden">
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-800 bg-[#1a1a1a]/50">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-zinc-100 font-display">
                Connectors
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-gothic mt-0.5">
                Supercharge your AI agent with marketing tools, APIs, and real-time data
              </p>
            </div>
            <button
              onClick={closeModal}
              className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Categories (desktop only) */}
            <div className="hidden md:flex w-52 lg:w-56 border-r border-zinc-800 bg-[#161616] p-4 flex-col justify-between shrink-0">
              <div className="space-y-1">
                <button className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium font-gothic bg-[#2a2a2a] text-zinc-100">
                  <SlidersHorizontal size={14} />
                  <span>All Connectors</span>
                </button>
              </div>

              <div className="p-3 bg-[#242424] rounded-xl border border-zinc-800 text-[11px] text-zinc-400 font-gothic space-y-1">
                <div className="flex items-center space-x-1.5 text-zinc-200 font-medium">
                  <CheckCircle2 size={13} className="text-zinc-300" />
                  <span>Secure OAuth 2.0</span>
                </div>
                <p>
                  Credentials and access tokens are encrypted and isolated per user in Supabase.
                </p>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden min-w-0">
              {/* Search Bar */}
              <div className="p-3 sm:p-4 border-b border-zinc-800 bg-[#1a1a1a]/30 flex items-center space-x-3">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3 top-3 text-zinc-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tools, platforms, databases..."
                    className="w-full bg-[#242424] border border-zinc-700/60 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 font-gothic"
                  />
                </div>
              </div>

              {/* Connectors Grid */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                {isLoading ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                    <span className="text-xs text-zinc-500 font-gothic">
                      Loading connectors...
                    </span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-2">
                    <p className="text-sm text-zinc-400 font-gothic">
                      No connectors found
                    </p>
                    <p className="text-xs text-zinc-600 font-gothic">
                      Try adjusting your search query
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {filtered.map((connector) => {
                      return (
                        <div
                          key={connector.id}
                          className="group relative flex flex-col justify-between p-4 bg-[#242424] hover:bg-[#282828] border border-zinc-800 hover:border-zinc-700/80 rounded-2xl transition-all shadow-sm"
                        >
                          <div>
                            {/* Card Header: Icon & Action */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={connector.icon}
                                  alt={connector.name}
                                  className="h-10 w-10 rounded-xl object-contain bg-[#1c1c1c] p-1.5 border border-zinc-800"
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    target.style.display = "none";
                                    const fallback = target.nextElementSibling as HTMLElement | null;
                                    if (fallback) {
                                      fallback.style.display = "flex";
                                    }
                                  }}
                                />
                                <div
                                  style={{ display: "none" }}
                                  className="h-10 w-10 rounded-xl bg-[#282828] border border-zinc-700/60 items-center justify-center text-xs font-bold text-zinc-300 font-display flex-shrink-0"
                                  aria-label={connector.name}
                                >
                                  {connector.name.charAt(0)}
                                </div>
                                <div>
                                  <h3 className="text-sm font-semibold text-zinc-100 font-display leading-tight">
                                    {connector.name}
                                  </h3>
                                  <span className="text-[11px] text-zinc-500 font-mono">
                                    By {connector.author}
                                  </span>
                                </div>
                              </div>

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
                                      <button
                                        onClick={() => {
                                          setActiveMenuId(null);
                                          setManageConnector(connector);
                                        }}
                                        className="w-full flex items-center space-x-2 px-3 py-2 hover:bg-[#333] hover:text-white transition-colors text-left"
                                      >
                                        <Settings2 size={13} />
                                        <span>Manage</span>
                                      </button>
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
                                  className="text-emerald-400 flex-shrink-0"
                                />
                                <span>Connected</span>
                              </div>
                            ) : (
                              <span className="text-zinc-500">
                                Not connected
                              </span>
                            )}

                            {connector.connected && (
                              <button
                                onClick={() => setManageConnector(connector)}
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
      </div>

      <ConnectorManageModal
        isOpen={Boolean(manageConnector)}
        connector={manageConnector}
        onClose={() => {
          setManageConnector(null);
          closeConfig();
        }}
        onDisconnect={handleDisconnect}
        onConfigSaved={() => loadConnectors()}
      />
    </>
  );
}
