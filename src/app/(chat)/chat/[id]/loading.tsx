import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col bg-[#212121] min-h-0 overflow-hidden">
      <header className="h-14 flex-shrink-0 flex items-center justify-center border-b border-zinc-800/50 bg-[#212121]/95 backdrop-blur-md z-10 px-4">
        <div className="flex items-center space-x-2">
          <span className="font-display font-medium text-zinc-200">
            Chief 1.5
          </span>
        </div>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
      </div>
    </div>
  );
}
