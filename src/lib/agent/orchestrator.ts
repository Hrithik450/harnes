import { getAgentModel } from "@/lib/providers";
import { generateText, isStepCount } from "ai";
import { ThreadMessageService } from "@/lib/services";
import { getSystemPrompt } from "./system.prompt";
import { agentTools } from "./tools";
import { resolveSurgicallySlicedContext } from "./agents";

export async function runAgent(
  threadId: string | undefined,
  message: string,
  userId?: string,
) {
  let contextMessages: {
    role: "user" | "assistant" | "system";
    content: string;
  }[] = [];

  if (threadId) {
    const conversationHistory =
      await ThreadMessageService.getMessagesByThreadId(threadId, userId);
    if (conversationHistory.success && conversationHistory.data) {
      const history = conversationHistory.data;
      const lastMsg = history[history.length - 1];
      const pastMessages =
        lastMsg && lastMsg.role === "user" && lastMsg.content.text === message
          ? history.slice(0, -1)
          : history;

      contextMessages = await resolveSurgicallySlicedContext(
        threadId,
        message,
        pastMessages,
      );
    }
  }

  if (contextMessages.length === 0) {
    contextMessages = [
      {
        role: "user",
        content: message,
      },
    ];
  }

  const runStart = Date.now();
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase().trim();
  const modelName = process.env.OPENAI_MODEL || "gpt-4o";
  console.log(
    `[Orchestrator:runAgent:Start] provider=${provider}, model=${modelName}, threadId=${threadId || "new"}, historyCount=${contextMessages.length - 1}, inputPreview="${message.slice(0, 100)}..."`,
  );

  try {
    const result = await generateText({
      model: getAgentModel(),
      system: getSystemPrompt(),
      messages: contextMessages,
      stopWhen: isStepCount(50),
      tools: {
        ...agentTools,
      },
      abortSignal: AbortSignal.timeout(280000),
    });

    console.log(
      `[Orchestrator:runAgent:Success] ✅ Completed in ${Date.now() - runStart}ms | steps=${result.steps.length} | finishReason=${result.finishReason}`,
    );

    return result;
  } catch (err) {
    console.error(
      `[Orchestrator:runAgent:Error] ❌ AI generation failed after ${Date.now() - runStart}ms:`,
      err,
    );
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("AI model request timed out");
    }
    throw err;
  }
}
