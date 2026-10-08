import { generateText, isStepCount, type StepResult } from "ai";
import { googleProvider } from "@/lib/gemini/custom-google-provider";
import { ThreadMessageService } from "@/lib/services/thread.message.service";
import { getSystemPrompt } from "./system.prompt";
import { agentTools } from "./tools";

/** One finished LLM step of a run, as handed to `onStepFinish`. */
export type AgentStepResult = StepResult<typeof agentTools>;

export type AgentStepHandler = (
  event: AgentStepResult,
) => Promise<void> | void;

export async function runAgent(
  threadId: string | undefined,
  message: string,
  onStepFinish?: AgentStepHandler,
) {
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

  const res = await generateText({
    model: googleProvider("gemini-2.5-flash"),
    system: getSystemPrompt(),
    messages: contextMessages,
    // NOTE: ai@v7 removed `maxSteps`. Without an explicit stop condition the
    // default is isStepCount(1) — a single step — so any tool-calling turn
    // ends on an empty final text and the UI gets nothing.
    stopWhen: isStepCount(5),
    tools: {
      ...agentTools,
    },
    onStepFinish,
  });

  return res;
}
