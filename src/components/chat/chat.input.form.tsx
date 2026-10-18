"use client";

import React, { useState, useRef, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import {
  Plus,
  Mic,
  Paperclip,
  Sparkles,
  SlidersHorizontal,
  Globe,
  Check,
  Square,
} from "lucide-react";
import { useConnectorStore } from "@/store/connector.store";
import { toast } from "sonner";

interface ChatInputFormProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  onSubmit: (e: React.FormEvent | React.KeyboardEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isStreaming: boolean;
  onStop?: () => void;
  isBlocked?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatInputForm({
  inputValue,
  setInputValue,
  onSubmit,
  onKeyDown,
  isStreaming,
  onStop,
  isBlocked = false,
  placeholder = "Message Chief",
  className = "w-full max-w-3xl mx-auto relative",
}: ChatInputFormProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const { openModal: openConnectorsModal } = useConnectorStore();

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  return (
    <form
      onSubmit={(e) => {
        if (isBlocked) {
          e.preventDefault();
          toast.info("Please complete the questions above to continue.");
          return;
        }
        onSubmit(e);
      }}
      className={className}
    >
      <div className="flex items-end bg-[#2a2a2a] rounded-2xl pl-2 pr-2 py-2 transition-colors relative min-h-[52px]">
        {/* Action Menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`h-[36px] w-[36px] flex items-center justify-center rounded-xl transition-colors flex-shrink-0 ${
              isMenuOpen
                ? "bg-[#444] text-white"
                : "bg-[#333] text-zinc-300 hover:bg-[#444]"
            }`}
            title="Add content or connectors"
          >
            <Plus
              size={18}
              className={
                isMenuOpen
                  ? "rotate-45 transition-transform"
                  : "transition-transform"
              }
            />
          </button>

          {isMenuOpen && (
            <div className="absolute bottom-12 left-0 z-40 w-56 max-w-[calc(100vw-2.5rem)] bg-[#2a2a2a] border border-zinc-700/80 rounded-2xl shadow-2xl p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  toast.info("File upload coming soon");
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-gothic text-zinc-300 hover:text-white hover:bg-[#333] rounded-xl transition-colors text-left"
              >
                <Paperclip size={15} className="text-zinc-400" />
                <span>Add files or photos</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  toast.info("Skills library available via prompt");
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-gothic text-zinc-300 hover:text-white hover:bg-[#333] rounded-xl transition-colors text-left"
              >
                <Sparkles size={15} className="text-zinc-400" />
                <span>Skills</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  openConnectorsModal();
                }}
                className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs font-gothic text-zinc-300 hover:text-white hover:bg-[#333] rounded-xl transition-colors text-left"
              >
                <SlidersHorizontal size={15} className="text-zinc-400" />
                <span className="flex-1 font-medium text-zinc-100">
                  Connectors
                </span>
              </button>

              <div className="h-px bg-zinc-700/60 my-1" />

              <button
                type="button"
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-gothic text-zinc-300 hover:text-white hover:bg-[#333] rounded-xl transition-colors text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <Globe size={15} className="text-zinc-400" />
                  <span>Web search</span>
                </div>
                {webSearchEnabled && (
                  <Check size={14} className="text-zinc-200" />
                )}
              </button>
            </div>
          )}
        </div>

        <TextareaAutosize
          rows={1}
          minRows={1}
          maxRows={8}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (isStreaming && e.key === "Escape") {
              e.preventDefault();
              onStop?.();
              return;
            }
            if (!e.nativeEvent.isComposing && (isBlocked || isStreaming) && e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (isBlocked) {
                toast.info("Please complete the questions above to continue.");
              }
              return;
            }
            onKeyDown(e);
          }}
          placeholder={
            isBlocked
              ? "Please complete the questions above to continue..."
              : placeholder
          }
          className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none font-gothic text-zinc-200 placeholder:text-zinc-500 shadow-none px-2.5 sm:px-4 py-1.5 text-[16px] sm:text-[15px] leading-6 min-h-[36px] resize-none overflow-y-auto"
          style={{
            boxShadow: "none",
            border: "none",
            outline: "none",
            WebkitBoxShadow: "none",
            height: 36,
          }}
        />

        <button
          type={!isStreaming && inputValue.trim() && !isBlocked ? "submit" : "button"}
          disabled={!isStreaming && isBlocked}
          onClick={(e) => {
            if (isStreaming) {
              e.preventDefault();
              onStop?.();
              return;
            }
            if (isBlocked) {
              e.preventDefault();
              toast.info("Please complete the questions above to continue.");
            }
          }}
          className={`h-[36px] w-[36px] flex items-center justify-center rounded-xl transition-all ml-1 flex-shrink-0 ${
            isStreaming
              ? "bg-[#f4f4f5] text-zinc-900 hover:bg-white cursor-pointer shadow-sm active:scale-95"
              : isBlocked
              ? "bg-[#383838] text-zinc-500 cursor-not-allowed opacity-40"
              : "bg-[#f4f4f5] text-zinc-900 hover:bg-white disabled:opacity-50"
          }`}
          title={
            isStreaming
              ? "Stop generating"
              : isBlocked
              ? "Please complete the questions above to continue"
              : undefined
          }
          aria-label={isStreaming ? "Stop generating" : "Send message"}
        >
          {isStreaming ? (
            <Square className="h-3.5 w-3.5 fill-current" />
          ) : inputValue.trim() ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          ) : (
            <Mic size={16} />
          )}
        </button>
      </div>
    </form>
  );
}
