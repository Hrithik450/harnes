"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ImageOff, Loader2, Maximize2 } from "lucide-react";
import { ImageLightboxModal } from "./chat/image.lightbox.modal";

interface MarkdownImageProps {
  src: string;
  alt: string;
}

export function MarkdownImage({ src, alt }: MarkdownImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleRef = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node) {
      if (node.complete && node.naturalWidth > 0) {
        setIsLoading(false);
      } else if (typeof node.decode === "function") {
        node
          .decode()
          .then(() => setIsLoading(false))
          .catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) {
      setIsLoading(false);
    }
  }, [src]);

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
    <>
      <span
        onClick={() => setLightboxOpen(true)}
        className={`group relative rounded-xl overflow-hidden my-3 block w-fit max-w-full border border-zinc-800/80 bg-zinc-900/60 hover:border-zinc-700 transition-all cursor-pointer shadow-md select-none ${
          isLoading ? "min-w-[240px] min-h-[320px]" : ""
        }`}
      >
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm z-10 pointer-events-none transition-opacity">
            <span className="flex flex-col items-center">
              <Loader2 className="w-7 h-7 animate-spin text-zinc-400 mb-2" />
              <span className="block text-xs text-zinc-400">Loading image...</span>
            </span>
          </span>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={handleRef}
          src={src}
          alt={alt || "Generated image"}
          loading="eager"
          decoding="async"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          className="w-auto h-auto max-h-[480px] max-w-full rounded-xl !m-0 block object-contain transition-transform duration-300 group-hover:scale-[1.01]"
        />

        <span className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-opacity z-20 pointer-events-none">
          <Maximize2 size={13} />
        </span>
      </span>

      <ImageLightboxModal
        isOpen={lightboxOpen}
        images={[{ src, alt }]}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
