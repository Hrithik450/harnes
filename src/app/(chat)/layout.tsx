import { Sidebar } from "@/components/chat/sidebar";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-[#1e1e1e] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />
      {children}
    </div>
  );
}
