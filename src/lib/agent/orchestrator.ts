import { generateText, isStepCount, type StepResult } from "ai";
import { defaultAgentModel } from "@/lib/providers/google";
import { executeOpenAiAgent, isOpenAiConfigured } from "@/lib/providers/openai";
import { ThreadMessageService } from "@/lib/services/thread.message.service";
import { getSystemPrompt } from "./system.prompt";
import { agentTools } from "./tools";

export type AgentStepResult = StepResult<typeof agentTools>;

export type AgentStepHandler = (event: AgentStepResult) => Promise<void> | void;

export async function runAgent(
  threadId: string | undefined,
  message: string,
  onStepFinish?: AgentStepHandler,
) {
  const provider = (process.env.AI_PROVIDER || "google").toLowerCase().trim();

  // 1. If configured to openai, run the OpenAI Agents API
  if (provider === "openai" && isOpenAiConfigured()) {
    console.log("[runAgent] Running turn via OpenAI Agents API...");
    return await executeOpenAiAgent(
      threadId,
      message,
      getSystemPrompt(),
      onStepFinish,
    );
  }

  // 2. Otherwise default cleanly to Gemini config
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

  try {
    return await generateText({
      model: defaultAgentModel,
      system: getSystemPrompt(),
      messages: contextMessages,
      stopWhen: isStepCount(5),
      tools: {
        ...agentTools,
      },
      onStepFinish,
      abortSignal: AbortSignal.timeout(50000),
    });
  } catch (err) {
    console.error("[runAgent] Error:", err);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("AI model request timed out");
    }
    throw err;
  }
}
