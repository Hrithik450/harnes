import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ChatListItemProps {
  name: string;
  time: string;
  preview: string;
  isGroup?: boolean;
}

export function ChatListItem({ 
  name, 
  time, 
  preview,
  isGroup = false
}: ChatListItemProps) {
  return (
    <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-[#242424] cursor-pointer transition-colors group">
      <div className="relative">
        <Avatar className={`h-10 w-10 flex items-center justify-center bg-transparent p-0 ${isGroup ? 'opacity-80' : ''}`}>
          <AvatarImage
             src={`/bot/chief-animated.svg`}
             alt={name}
          />
          <AvatarFallback className="bg-transparent text-black font-bold" />
        </Avatar>
        {isGroup && (
          <Avatar className="h-6 w-6 absolute -bottom-1 -right-1 border-2 border-[#161616] bg-indigo-500">
             <AvatarFallback className="bg-transparent"></AvatarFallback>
          </Avatar>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="font-medium text-[15px] truncate text-zinc-200 group-hover:text-white transition-colors">{name}</span>
          <span className="text-xs text-zinc-500 group-hover:text-zinc-400">{time}</span>
        </div>
        <p className="text-[13px] text-zinc-500 truncate group-hover:text-zinc-400">{preview}</p>
      </div>
    </div>
  );
}
