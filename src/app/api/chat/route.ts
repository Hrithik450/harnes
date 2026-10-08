import { runAgent, type AgentStepResult } from "@/lib/agent/orchestrator";
import { extractThoughts, stripThoughtTags } from "@/lib/agent/thoughts";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { message, threadId } = await req.json();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: unknown) => {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      try {
        // Walk the agent's LLM steps as they finish and turn each one into
        // thoughts for the loading UI. We never fake delays here — the client
        // owns the reveal cadence, so the stream stays purely event-driven.
        let stepIndex = 0;
        const result = await runAgent(
          threadId,
          message,
          (stepEvent: AgentStepResult) => {
            const thoughts = extractThoughts(stepEvent, stepIndex);

            for (const thought of thoughts) {
              sendEvent("thought", {
                id: crypto.randomUUID(),
                title: thought.title,
                subtitle: thought.subtitle,
              });
            }

            stepIndex += 1;
          },
        );

        console.log("Total LLM steps taken:", result.steps.length);

        // Signal that no more thoughts are coming. The client uses this to
        // know it may release the buffered final text once its reveal queue drains.
        sendEvent("thoughtsDone", { totalSteps: result.steps.length });

        // Final prose: the last step is often a tool call with empty text, so
        // walk backwards for the most recent step that produced real prose.
        let finalContent = "";
        for (let i = result.steps.length - 1; i >= 0; i--) {
          const candidate = stripThoughtTags(result.steps[i]?.text || "");
          if (candidate.length > 0) {
            finalContent = candidate;
            break;
          }
        }
        if (!finalContent) {
          finalContent = stripThoughtTags(result.text || "");
        }

        if (finalContent.length > 0) {
          sendEvent("assistantResponse", finalContent);
        } else {
          console.warn("Agent produced no assistant text; sending fallback.");
          sendEvent(
            "assistantResponse",
            "I wasn't able to produce a response for that. Could you rephrase or add a bit more detail?",
          );
        }

        sendEvent("done", {});
      } catch (err) {
        console.error("Stream error:", err);
        sendEvent("error", {
          message: "Something went wrong while generating the response.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "x-thread-id": threadId || "",
    },
  });
}
