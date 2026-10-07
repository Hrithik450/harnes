import { runAgent } from "@/lib/agent/orchestrator";

// Allow streaming responses up to 30 seconds
export const maxDuration = 60;

export async function POST(req: Request) {
  const { message, threadId } = await req.json();

  const result = await runAgent(threadId, message);

  return result.toUIMessageStreamResponse({
    headers: {
      "x-thread-id": threadId || "",
    },
  });
}
