import { MainChat } from "@/components/chat/main.chat";
import { ThreadMessageService } from "@/lib/services";
import { ThreadMessage } from "@/lib/repositories/types/thread.message.types";
import { getSessionFromCookies } from "@/lib/auth/session";
import { notFound, redirect } from "next/navigation";

export default async function ChatConversationPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const session = await getSessionFromCookies();

  if (!session) {
    redirect(
      "/?auth_error=" +
        encodeURIComponent("Please login before accessing conversations"),
    );
  }

  const messagesRes = await ThreadMessageService.getMessagesByThreadId(
    id,
    session.id,
  );

  if (!messagesRes.success) {
    if (messagesRes.error === "Thread not found") {
      notFound();
    }
    redirect("/");
  }

  const initialMessages: ThreadMessage[] = messagesRes.data || [];

  return <MainChat initialMessages={initialMessages} />;
}
