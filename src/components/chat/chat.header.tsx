"use client";

import React from "react";
import { Menu, Plus } from "lucide-react";
import { useSidebarStore } from "@/store/sidebar.store";
import { useRouter } from "next/navigation";
import { useThreadStore } from "@/store/thread.store";
import { useUserStore } from "@/store/user.store";
import { toast } from "sonner";

interface ChatHeaderProps {
  title?: string;
  className?: string;
}

export function ChatHeader({
  title = "Chief 1.5",
  className = "bg-[#212121]/95",
}: ChatHeaderProps) {
  const { toggleMobile } = useSidebarStore();
  const router = useRouter();
  const { setActiveThreadId } = useThreadStore();
  const { user } = useUserStore();

  const handleNewChat = () => {
    if (!user) {
      toast.error("Please login before starting conversations");
      return;
    }
    setActiveThreadId(null);
    router.push("/");
  };

  return (
    <header
      className={`h-14 flex-shrink-0 flex items-center justify-between border-b border-zinc-800/50 backdrop-blur-md z-10 px-3 sm:px-4 ${className}`}
    >
      {/* Left: Mobile hamburger menu */}
      <div className="flex items-center min-w-[40px]">
        <button
          type="button"
          onClick={toggleMobile}
          className="md:hidden p-2 -ml-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-xl transition-colors active:scale-95"
          title="Open menu"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Center: Title */}
      <div className="flex items-center space-x-2">
        <span className="font-display font-medium text-sm sm:text-base text-zinc-200 truncate max-w-[200px] sm:max-w-xs">
          {title}
        </span>
      </div>

      {/* Right: Mobile quick new chat */}
      <div className="flex items-center justify-end min-w-[40px]">
        <button
          type="button"
          onClick={handleNewChat}
          className="md:hidden p-2 -mr-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 rounded-xl transition-colors active:scale-95"
          title="New Chat"
          aria-label="New Chat"
        >
          <Plus size={20} />
        </button>
      </div>
    </header>
  );
}
