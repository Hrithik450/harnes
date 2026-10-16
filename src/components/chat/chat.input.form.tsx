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
} from "lucide-react";
import { DropdownItem } from "../dropdown.item";
import { useConnectorStore } from "@/store/connector.store";
import { toast } from "sonner";

export interface ActiveUiAction {
  type: string;
  listId: string;
  message: string;
}

interface ChatInputFormProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  onSubmit: (e: React.FormEvent | React.KeyboardEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isStreaming: boolean;
  activeUiAction?: ActiveUiAction | null;
  placeholder?: string;
  className?: string;
}

export function ChatInputForm({
  inputValue,
  setInputValue,
  onSubmit,
  onKeyDown,
  isStreaming,
  activeUiAction,
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
    <form onSubmit={onSubmit} className={className}>
      {activeUiAction?.type === "dropdown" && (
        <DropdownItem
          listId={activeUiAction.listId}
          message={activeUiAction.message}
          onSelect={(val: string) => {
            setInputValue(val);
          }}
        />
      )}

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
            <div className="absolute bottom-12 left-0 z-40 w-56 bg-[#2a2a2a] border border-zinc-700/80 rounded-2xl shadow-2xl p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
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
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none font-gothic text-zinc-200 placeholder:text-zinc-500 shadow-none px-4 py-1.5 text-[15px] leading-6 min-h-[36px] resize-none overflow-y-auto"
          style={{
            boxShadow: "none",
            border: "none",
            outline: "none",
            WebkitBoxShadow: "none",
            height: 36,
          }}
        />

        <button
          type={inputValue.trim() ? "submit" : "button"}
          disabled={isStreaming}
          className="h-[36px] w-[36px] flex items-center justify-center bg-[#f4f4f5] text-zinc-900 hover:bg-white rounded-xl transition-colors ml-1 flex-shrink-0 disabled:opacity-50"
        >
          {inputValue.trim() ? (
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
