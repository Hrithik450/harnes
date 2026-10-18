"use client";

import React from "react";
import { Image as ImageIcon, Pen, Globe } from "lucide-react";
import { ChatInputForm } from "./chat.input.form";

interface ChatEmptyStateProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  onSubmit: (e: React.FormEvent | React.KeyboardEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isStreaming: boolean;
  onStop?: () => void;
}

export function ChatEmptyState({
  inputValue,
  setInputValue,
  onSubmit,
  onKeyDown,
  isStreaming,
  onStop,
}: ChatEmptyStateProps) {
  const suggestions = [
    {
      icon: ImageIcon,
      text: "Create an image or sticker",
      prompt: "Generate an eye-catching marketing poster for our product",
    },
    {
      icon: Pen,
      text: "Write or edit marketing copy",
      prompt: "Draft 3 high-converting ad headlines and captions",
    },
    {
      icon: Globe,
      text: "Research competitors or keywords",
      prompt: "Analyze the top competitors in our niche and their ad strategies",
    },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 overflow-y-auto w-full">
      <div className="w-full max-w-3xl flex flex-col items-center">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-medium text-zinc-100 mb-6 sm:mb-10 text-center tracking-tight">
          Ready when you are.
        </h2>

        <div className="w-full">
          <ChatInputForm
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSubmit={onSubmit}
            onKeyDown={onKeyDown}
            isStreaming={isStreaming}
            onStop={onStop}
            className="w-full relative mb-6 sm:mb-8"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 px-1 sm:px-2 w-full">
            {suggestions.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInputValue(item.prompt)}
                  className="flex items-center space-x-3 sm:space-x-2.5 p-3 sm:p-2.5 rounded-xl bg-zinc-900/40 sm:bg-transparent hover:bg-zinc-800/50 border border-zinc-800/60 sm:border-transparent hover:border-zinc-700/60 text-zinc-400 hover:text-zinc-200 transition-all text-left group active:scale-[0.98]"
                >
                  <div className="p-2 sm:p-1.5 rounded-lg bg-zinc-800/60 group-hover:bg-zinc-700/60 text-zinc-300 transition-colors flex-shrink-0">
                    <Icon size={18} className="group-hover:scale-105 transition-transform" />
                  </div>
                  <span className="text-[13px] sm:text-xs font-gothic line-clamp-1 sm:line-clamp-2">
                    {item.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
