import React from "react";
import { Image as ImageIcon, Pen, Globe } from "lucide-react";
import { ChatInputForm } from "./chat.input.form";

interface ChatEmptyStateProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  onSubmit: (e: React.FormEvent | React.KeyboardEvent) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isStreaming: boolean;
}

export function ChatEmptyState({
  inputValue,
  setInputValue,
  onSubmit,
  onKeyDown,
  isStreaming,
}: ChatEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
      <div className="w-full max-w-3xl flex flex-col items-center">
        <h2 className="text-3xl font-display font-medium text-zinc-100 mb-10 text-center">
          Ready when you are.
        </h2>

        <div className="w-full">
          <ChatInputForm
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSubmit={onSubmit}
            onKeyDown={onKeyDown}
            isStreaming={isStreaming}
            className="w-full relative mb-8"
          />

          <div className="flex flex-col space-y-6 px-4">
            <button className="flex items-center space-x-4 text-zinc-400 hover:text-zinc-200 transition-colors w-fit group">
              <ImageIcon
                size={20}
                className="group-hover:scale-105 transition-transform"
              />
              <span className="text-[15px] font-gothic">
                Create an image or sticker
              </span>
            </button>
            <button className="flex items-center space-x-4 text-zinc-400 hover:text-zinc-200 transition-colors w-fit group">
              <Pen
                size={20}
                className="group-hover:scale-105 transition-transform"
              />
              <span className="text-[15px] font-gothic">Write or edit</span>
            </button>
            <button className="flex items-center space-x-4 text-zinc-400 hover:text-zinc-200 transition-colors w-fit group">
              <Globe
                size={20}
                className="group-hover:scale-105 transition-transform"
              />
              <span className="text-[15px] font-gothic">
                Search the web
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
