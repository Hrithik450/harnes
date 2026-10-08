"use client";

import { useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";

interface MarkdownImageProps {
  src: string;
  alt: string;
}

export function MarkdownImage({ src, alt }: MarkdownImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
  };

  if (hasError) {
    return (
      <span className="flex flex-col items-center justify-center p-8 bg-zinc-800/30 rounded-lg border border-zinc-700/50 mt-2 mb-1">
        <ImageOff className="w-12 h-12 text-zinc-500 mb-3" />
        <span className="block text-sm text-zinc-300 mb-1 font-medium">Failed to load image</span>
        <span className="block text-xs text-zinc-500 mb-3">The image could not be loaded</span>
        <button
          onClick={handleRetry}
          className="text-xs text-zinc-300 hover:text-white bg-zinc-700/50 hover:bg-zinc-700 px-4 py-2 rounded-lg transition-colors"
        >
          Try again
        </button>
      </span>
    );
  }

  return (
    <span className="relative rounded-lg overflow-hidden my-1 max-w-full inline-block">
      {isLoading && (
        <span className="absolute inset-0 flex items-center justify-center bg-zinc-800/50 backdrop-blur-sm min-h-[200px]">
          <span className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-400 mb-2" />
            <span className="block text-xs text-zinc-400">Loading image...</span>
          </span>
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt || "Generated image"}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        className="max-w-full h-auto rounded-lg border border-zinc-700/50"
        style={{
          display: isLoading ? "none" : "block",
        }}
      />
    </span>
  );
}
