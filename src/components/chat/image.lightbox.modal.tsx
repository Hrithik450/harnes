"use client";

import React, { useEffect, useCallback, useState, useRef } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export interface Image {
  src: string;
  alt: string;
}
export type LightboxImage = Image;

export interface ImageboxModalProps {
  isOpen: boolean;
  images: Image[];
  initialIndex?: number;
  onClose: () => void;
}
export type ImageLightboxModalProps = ImageboxModalProps;

export function ImageboxModal({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
}: ImageboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  const currentImage = images[currentIndex] || images[0];

  const handleImageRef = useCallback((node: HTMLImageElement | null) => {
    if (node) {
      if (node.complete && node.naturalWidth > 0) {
        setIsImageLoading(false);
      } else if (typeof node.decode === "function") {
        node
          .decode()
          .then(() => setIsImageLoading(false))
          .catch(() => {});
      }
    }
  }, []);

  const handleNext = useCallback(() => {
    if (images.length <= 1) return;
    setIsImageLoading(true);
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    if (images.length <= 1) return;
    setIsImageLoading(true);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const diff = touchStartXRef.current - touchEndXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchEndXRef.current = null;
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleDownload = async () => {
    if (!currentImage?.src) return;
    try {
      toast.info("Downloading image...");
      const rawName =
        currentImage.alt?.replace(/[^a-zA-Z0-9_-]/g, "_") ||
        `image-${currentIndex + 1}`;
      const filename = rawName.endsWith(".webp") ? rawName : `${rawName}.webp`;

      const downloadProxyUrl = `/api/download?url=${encodeURIComponent(
        currentImage.src,
      )}&filename=${encodeURIComponent(filename)}`;

      const response = await fetch(downloadProxyUrl);
      if (!response.ok) throw new Error("Failed to download image");

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      toast.success("Image downloaded");
    } catch (err) {
      console.error("Download failed:", err);
      // Fallback: direct browser attachment navigation
      const fallbackFilename = `image-${currentIndex + 1}.webp`;
      const fallbackUrl = `/api/download?url=${encodeURIComponent(
        currentImage.src,
      )}&filename=${encodeURIComponent(fallbackFilename)}`;
      window.location.href = fallbackUrl;
    }
  };

  if (!isOpen || !currentImage) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 backdrop-blur-md animate-in fade-in duration-200 select-none p-2 sm:p-6 safe-top safe-bottom"
    >
      {/* Top Header Controls */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full flex items-center justify-between z-20 max-w-7xl mx-auto py-2 px-2"
      >
        <div className="flex items-center gap-3 min-w-0">
          {currentImage.alt && (
            <span className="text-sm text-zinc-300 font-gothic truncate max-w-md hidden sm:inline-block">
              {currentImage.alt}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            title="Download Image"
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            <Download size={18} />
          </button>
          <a
            href={currentImage.src}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors"
          >
            <ExternalLink size={18} />
          </a>
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-colors ml-1"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative flex-1 w-full max-w-7xl flex items-center justify-center my-auto min-h-0 px-2 sm:px-4"
      >
        {/* Previous Button */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            title="Previous (Arrow Left)"
            className="absolute left-2 sm:left-4 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all hover:scale-105"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        {/* Loading Spinner */}
        {isImageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
          </div>
        )}

        {/* The Display Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={currentImage.src}
          ref={handleImageRef}
          src={currentImage.src}
          alt={currentImage.alt || "Lightbox view"}
          decoding="async"
          onLoad={() => setIsImageLoading(false)}
          className={`max-h-[72vh] max-w-full object-contain rounded-2xl shadow-2xl border border-white/10 transition-opacity duration-200 ${
            isImageLoading ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* Next Button */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            title="Next (Arrow Right)"
            className="absolute right-2 sm:right-4 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white/80 hover:text-white border border-white/10 hover:border-white/20 backdrop-blur-sm transition-all hover:scale-105"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl mx-auto flex items-center justify-center gap-2 py-2 overflow-x-auto z-20"
        >
          {images.map((img, idx) => (
            <button
              key={`${img.src}-${idx}`}
              onClick={() => {
                setIsImageLoading(true);
                setCurrentIndex(idx);
              }}
              className={`relative h-14 w-14 rounded-xl overflow-hidden flex-shrink-0 transition-all ${
                idx === currentIndex
                  ? "ring-2 ring-emerald-500 scale-105 opacity-100 border border-white/20"
                  : "opacity-40 hover:opacity-80 border border-zinc-700/60"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.src}
                alt={img.alt || `Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const ImageLightboxModal = ImageboxModal;
