import { Sidebar } from "@/components/sidebar";
import { ConnectorsProvider } from "@/components/connectors/connectors.provider";
import { getSessionFromCookies } from "@/lib/auth/session";
import { ThreadService } from "@/lib/services";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();
  const threadsRes = await ThreadService.getThreads(session?.id);
  const initialThreads =
    threadsRes.success && threadsRes.data ? threadsRes.data : [];

  return (
    <div className="flex h-[100dvh] w-full bg-[#1e1e1e] text-zinc-100 overflow-hidden font-sans relative">
      <Sidebar initialThreads={initialThreads} initialUser={session} />
      {children}
      <ConnectorsProvider />
    </div>
  );
}
