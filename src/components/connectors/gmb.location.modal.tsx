"use client";

import React, { useState, useEffect } from "react";
import { X, MapPin, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LocationItem {
  accountId: string;
  locationId: string;
  locationName: string;
  address?: string;
}

interface GmbLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelected?: (location: LocationItem) => void;
}

export function GmbLocationModal({
  isOpen,
  onClose,
  onLocationSelected,
}: GmbLocationModalProps) {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetch("/api/auth/gmb/locations")
      .then((res) => res.json())
      .then((data) => {
        if (data.availableLocations) {
          setLocations(data.availableLocations);
          setActiveLocationId(data.activeLocationId || "");
          setSelectedId(
            data.activeLocationId ||
              data.availableLocations[0]?.locationId ||
              "",
          );
        }
      })
      .catch((err) => {
        console.error("Failed to load locations:", err);
        toast.error("Failed to load Google Business locations");
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/auth/gmb/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: selectedId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Active location updated: ${data.activeLocation?.locationName}`,
        );
        if (onLocationSelected && data.activeLocation) {
          onLocationSelected(data.activeLocation);
        }
        onClose();
      } else {
        toast.error(data.error || "Failed to update location");
      }
    } catch {
      toast.error("Network error while updating location");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="w-full max-w-lg bg-[#212121] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#1e1e1e]/60">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#2a2a2a] border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <MapPin size={16} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-100 font-display">
                Select Business Location
              </h3>
              <p className="text-xs text-zinc-400 font-gothic">
                Choose the Google profile to post photos and sync reviews
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

        {/* Content */}
        <div className="p-6 max-h-[360px] overflow-y-auto space-y-2 bg-[#212121]">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              <p className="text-xs text-zinc-500 font-gothic">
                Loading locations from Google...
              </p>
            </div>
          ) : locations.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-sm font-gothic">
              No locations found under this Google account.
            </div>
          ) : (
            locations.map((loc) => {
              const isSelected = selectedId === loc.locationId;
              const isCurrent = activeLocationId === loc.locationId;

              return (
                <div
                  key={loc.locationId}
                  onClick={() => setSelectedId(loc.locationId)}
                  className={`flex items-start justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#303030] border-zinc-400 shadow-sm"
                      : "bg-[#2a2a2a] border-zinc-700/60 hover:border-zinc-500 hover:bg-[#2e2e2e]"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-sm text-zinc-100 font-display truncate">
                        {loc.locationName}
                      </span>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-[#383838] text-zinc-300 border border-zinc-700/60 rounded font-mono">
                          Current
                        </span>
                      )}
                    </div>
                    {loc.address && (
                      <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1 font-gothic">
                        {loc.address}
                      </p>
                    )}
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? "bg-[#f4f4f5] border-[#f4f4f5] text-zinc-900"
                        : "border-zinc-600 bg-[#1e1e1e]"
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 px-6 py-4 bg-[#1e1e1e]/60 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium font-gothic text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !selectedId || locations.length === 0}
            className="flex items-center space-x-1.5 px-4 py-2 bg-[#f4f4f5] hover:bg-white text-zinc-900 rounded-xl text-xs font-semibold font-gothic transition-colors disabled:opacity-50"
          >
            {isSaving && <Loader2 size={13} className="animate-spin" />}
            <span>Save & Activate</span>
          </button>
        </div>
      </div>
    </div>
  );
}
