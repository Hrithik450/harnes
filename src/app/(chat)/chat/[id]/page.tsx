import { MainChat } from "@/components/chat/main.chat";
import { ThreadMessageService } from "@/lib/services/thread.message.service";
import { ThreadMessage } from "@/lib/repositories/types/thread.message.types";

export default async function page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const messagesRes = await ThreadMessageService.getMessagesByThreadId(id);

  let initialMessages: ThreadMessage[] = [];
  if (messagesRes.success && messagesRes.data) {
    initialMessages = messagesRes.data;
  }

  return <MainChat initialMessages={initialMessages} />;
}
