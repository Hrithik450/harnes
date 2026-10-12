import React from "react";

interface ChatHeaderProps {
  title?: string;
  className?: string;
}

export function ChatHeader({
  title = "Chief 1.5",
  className = "bg-[#212121]/95",
}: ChatHeaderProps) {
  return (
    <header
      className={`h-14 flex-shrink-0 flex items-center justify-center border-b border-zinc-800/50 backdrop-blur-md z-10 px-4 ${className}`}
    >
      <div className="flex items-center space-x-2">
        <span className="font-display font-medium text-zinc-200">
          {title}
        </span>
      </div>
    </header>
  );
}
