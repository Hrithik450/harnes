import React from "react";

export function ChiefThinking() {
  return (
    <div className="flex items-center space-x-3 mb-3 py-2 px-1 w-full max-w-full transition-all duration-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/bot/chief-animated.svg"
        alt="Chief Thinking"
        className="w-5 h-5 opacity-90"
      />
      <span className="font-display font-medium bg-gradient-to-r from-zinc-300 to-zinc-500 bg-clip-text text-transparent animate-pulse tracking-wide text-sm">
        Chief is thinking...
      </span>
    </div>
  );
}
