import React from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Plus, Mic } from "lucide-react";
import { DropdownItem } from "../dropdown.item";

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

      <div className="flex items-end bg-[#2a2a2a] rounded-2xl pl-2 pr-2 py-2 transition-colors">
        <button
          type="button"
          className="p-2 bg-[#333] text-zinc-300 hover:bg-[#444] rounded-xl transition-colors flex-shrink-0"
        >
          <Plus size={20} />
        </button>
        <TextareaAutosize
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          maxRows={8}
          className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:outline-none font-gothic text-zinc-200 placeholder:text-zinc-500 shadow-none px-4 py-1.5 text-[15px] resize-none overflow-y-auto"
          style={{
            boxShadow: "none",
            border: "none",
            outline: "none",
            WebkitBoxShadow: "none",
          }}
        />
        <button
          type={inputValue.trim() ? "submit" : "button"}
          disabled={isStreaming}
          className="p-2.5 bg-[#f4f4f5] text-zinc-900 hover:bg-white rounded-xl transition-colors ml-1 flex-shrink-0 disabled:opacity-50"
        >
          {inputValue.trim() ? (
            <svg
              width="18"
              height="18"
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
            <Mic size={18} />
          )}
        </button>
      </div>
    </form>
  );
}
