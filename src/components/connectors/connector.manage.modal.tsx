"use client";

import React, { useState } from "react";
import {
  X,
  Check,
  MapPin,
  Key,
  ShieldCheck,
  LogOut,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";

export interface ConnectorItem {
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

interface ConnectorManageModalProps {
  isOpen: boolean;
  connector: ConnectorItem | null;
  onClose: () => void;
  onDisconnect: (id: string) => Promise<void>;
  onConfigSaved?: () => void;
}

export function ConnectorManageModal({
  isOpen,
  connector,
  onClose,
  onDisconnect,
  onConfigSaved,
}: ConnectorManageModalProps) {
  const [showRawJson, setShowRawJson] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen || !connector) return null;

  const metadata = connector.metadata || {};
  const isGmb = connector.id === "google_gmb";
  const isGrowEasy = connector.id === "groweasy";

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    toast.success(`Copied ${keyName} to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSwitchLocation = async () => {
    if (!selectedLocationId) return;
    setIsSavingLocation(true);
    try {
      const res = await fetch("/api/auth/gmb/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: selectedLocationId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Switched active location to: ${data.activeLocation?.locationName}`,
        );
        if (onConfigSaved) onConfigSaved();
        onClose();
      } else {
        toast.error(data.error || "Failed to switch location");
      }
    } catch (err) {
      console.error("[ConnectorManageModal:SwitchLocation:Error]", err);
      toast.error("Failed to switch location");
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleDisconnectClick = async () => {
    setIsDisconnecting(true);
    try {
      await onDisconnect(connector.id);
      onClose();
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Extract GMB specific fields
  const activeLocationId = String(metadata.locationId || "locations/default");
  const activeLocationName = String(
    metadata.locationName || "Google Business Location",
  );
  const accountId = String(metadata.accountId || "accounts/default");
  const address = metadata.address ? String(metadata.address) : null;
  const availableLocations = Array.isArray(metadata.availableLocations)
    ? (metadata.availableLocations as Array<{
        locationId: string;
        locationName: string;
        address?: string;
      }>)
    : [];

  // Extract GrowEasy specific fields
  const defaultOrgId = metadata.defaultOrgId
    ? String(metadata.defaultOrgId)
    : "default";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-2.5 sm:p-4 font-sans">
      <div className="w-full max-w-lg bg-[#212121] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-zinc-800 bg-[#1e1e1e]/80">
          <div className="flex items-center space-x-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={connector.icon}
              alt={connector.name}
              className="h-8 w-8 rounded-lg object-contain bg-[#2a2a2a] p-1 border border-zinc-700/60"
            />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold text-zinc-100 font-display">
                  {connector.name}
                </h3>
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Check size={10} strokeWidth={3} />
                  <span>Connected</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-gothic">
                Manage connection metadata & settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-[#2a2a2a] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 bg-[#212121] flex-1">
          {/* GMB Profile Card */}
          {isGmb && (
            <div className="space-y-4">
              <div className="bg-[#262626] border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <span className="text-xs font-medium text-zinc-400">
                    Active Profile Location
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Live Sync
                  </span>
                </div>

                <div>
                  <div className="flex items-center space-x-2">
                    <MapPin
                      size={15}
                      className="text-emerald-400 flex-shrink-0"
                    />
                    <span className="text-sm font-medium text-zinc-100 font-display">
                      {activeLocationName}
                    </span>
                  </div>
                  {address && (
                    <p className="text-xs text-zinc-400 ml-6 mt-0.5">
                      {address}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="bg-[#1f1f1f] p-2.5 rounded-lg border border-zinc-800/60">
                    <span className="text-[11px] text-zinc-500 block">
                      Account ID
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono text-zinc-300 truncate text-[11px]">
                        {accountId}
                      </span>
                      <button
                        onClick={() => handleCopy(accountId, "Account ID")}
                        className="text-zinc-500 hover:text-zinc-300 ml-1"
                      >
                        {copiedKey === "Account ID" ? (
                          <CheckCheck size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#1f1f1f] p-2.5 rounded-lg border border-zinc-800/60">
                    <span className="text-[11px] text-zinc-500 block">
                      Location ID
                    </span>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="font-mono text-zinc-300 truncate text-[11px]">
                        {activeLocationId}
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(activeLocationId, "Location ID")
                        }
                        className="text-zinc-500 hover:text-zinc-300 ml-1"
                      >
                        {copiedKey === "Location ID" ? (
                          <CheckCheck size={12} className="text-emerald-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Switcher if multiple are accessible */}
              {availableLocations.length > 1 && (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-zinc-300 block">
                    Switch Active Location
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {availableLocations.map((loc) => {
                      const isCurrent = loc.locationId === activeLocationId;
                      const isSelected =
                        selectedLocationId === loc.locationId ||
                        (!selectedLocationId && isCurrent);

                      return (
                        <div
                          key={loc.locationId}
                          onClick={() => setSelectedLocationId(loc.locationId)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? "bg-zinc-800 border-zinc-500 text-white"
                              : "bg-[#262626] border-zinc-800/80 text-zinc-300 hover:border-zinc-700"
                          }`}
                        >
                          <div className="truncate mr-2">
                            <span className="font-medium">
                              {loc.locationName}
                            </span>
                            {loc.address && (
                              <p className="text-[11px] text-zinc-400 truncate">
                                {loc.address}
                              </p>
                            )}
                          </div>
                          {isCurrent && (
                            <span className="text-[10px] bg-zinc-700/60 px-1.5 py-0.5 rounded text-zinc-300 flex-shrink-0">
                              Current
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedLocationId &&
                    selectedLocationId !== activeLocationId && (
                      <button
                        onClick={handleSwitchLocation}
                        disabled={isSavingLocation}
                        className="w-full py-2 bg-zinc-200 hover:bg-white text-zinc-900 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
                      >
                        {isSavingLocation && (
                          <Loader2 size={13} className="animate-spin" />
                        )}
                        <span>Update Active Location</span>
                      </button>
                    )}
                </div>
              )}
            </div>
          )}

          {/* GrowEasy Profile Card */}
          {isGrowEasy && (
            <div className="space-y-4">
              <div className="bg-[#262626] border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                  <span className="text-xs font-medium text-zinc-400">
                    GrowEasy Model Context Protocol
                  </span>
                  <span className="text-[11px] text-emerald-400 font-mono">
                    Active
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-[#1f1f1f] p-2.5 rounded-lg border border-zinc-800/60 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-500 block">
                        Default Organization ID
                      </span>
                      <span className="font-mono text-zinc-300 text-xs">
                        {defaultOrgId}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(defaultOrgId, "Org ID")}
                      className="text-zinc-500 hover:text-zinc-300"
                    >
                      {copiedKey === "Org ID" ? (
                        <CheckCheck size={12} className="text-emerald-400" />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>

                  <div className="bg-[#1f1f1f] p-2.5 rounded-lg border border-zinc-800/60">
                    <span className="text-[11px] text-zinc-500 block">
                      MCP Server Endpoint
                    </span>
                    <span className="font-mono text-zinc-300 text-xs">
                      https://groweasy.ai/api/mcp
                    </span>
                  </div>

                  <div className="bg-[#1f1f1f] p-2.5 rounded-lg border border-zinc-800/60 flex items-center space-x-2">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span className="text-[11px] text-zinc-300">
                      Scoped tools: campaigns, marketing audit, multi-channel
                      agents
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Generic Connector Card if not GMB or GrowEasy */}
          {!isGmb && !isGrowEasy && (
            <div className="bg-[#262626] border border-zinc-800 rounded-xl p-4 space-y-2">
              <span className="text-xs font-medium text-zinc-400 block mb-2">
                Connection Attributes
              </span>
              {Object.keys(metadata).length === 0 ? (
                <p className="text-xs text-zinc-500 italic">
                  No extra metadata stored.
                </p>
              ) : (
                Object.entries(metadata).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-800/40 last:border-0"
                  >
                    <span className="text-zinc-400 capitalize">{key}:</span>
                    <span className="font-mono text-zinc-200 truncate max-w-[240px]">
                      {typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Raw Metadata Accordion */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-[#242424]">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Key size={13} />
                <span>View Raw Metadata Payload (JSON)</span>
              </div>
              {showRawJson ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
            </button>

            {showRawJson && (
              <div className="p-3 bg-[#181818] border-t border-zinc-800">
                <pre className="text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap p-2 bg-black/40 rounded-lg">
                  {JSON.stringify(metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1e1e1e]/80 border-t border-zinc-800">
          <button
            onClick={handleDisconnectClick}
            disabled={isDisconnecting}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors disabled:opacity-50"
          >
            {isDisconnecting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <LogOut size={13} />
            )}
            <span>Disconnect</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-200 hover:bg-white text-zinc-900 rounded-xl text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
