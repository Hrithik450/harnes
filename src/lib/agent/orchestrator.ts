import { streamText, isLoopFinished } from "ai";
import { googleProvider } from "@/lib/gemini/custom-google-provider";
import { ThreadMessageService } from "@/lib/services/thread.message.service";
import { getSystemPrompt } from "./system.prompt";
import { agentTools } from "./tools";

export async function runAgent(threadId: string | undefined, message: string) {
  let contextMessages: {
    role: "user" | "assistant" | "system";
    content: string;
  }[] = [];

  if (threadId) {
    const conversationHistory =
      await ThreadMessageService.getMessagesByThreadId(threadId);
    if (conversationHistory.success && conversationHistory.data) {
      const recentHistory = conversationHistory.data.slice(-20);
      contextMessages = recentHistory.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content as string,
      }));
    }
  }

  contextMessages.push({
    role: "user",
    content: message,
  });

  const res = streamText({
    model: googleProvider("gemini-3.5-flash-lite"),
    system: getSystemPrompt(),
    messages: contextMessages,
    stopWhen: [isLoopFinished()],
    tools: {
      ...agentTools,
    },
  });

  return res;
}
