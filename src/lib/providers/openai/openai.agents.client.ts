import { isOpenAiConfigured } from "./openai.provider";

export interface OpenAiAgentConfig {
  model?: string;
  instructions?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: Array<Record<string, any>>;
  environment?: {
    type: "openai_hosted" | "self_hosted";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

export interface OpenAiAgentSession {
  id: string;
  object: "agent.session";
  created_at: number;
  agent: OpenAiAgentConfig;
  status?: string;
}

export interface OpenAiAgentTurn {
  id: string;
  session_id: string;
  status: "in_progress" | "completed" | "failed" | "requires_action";
  output?: Array<{
    type: string;
    text?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>;
}

export class OpenAiAgentsClient {
  private baseUrl = "https://api.openai.com/v1/beta/agents";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
      "OpenAI-Beta": "agents=v1",
    };
  }

  public isAvailable(): boolean {
    return isOpenAiConfigured();
  }

  /**
   * Create a new persistent agent session
   */
  public async createSession(
    config: OpenAiAgentConfig,
  ): Promise<OpenAiAgentSession> {
    if (!this.isAvailable()) {
      throw new Error("OpenAI API key is not configured.");
    }

    const res = await fetch(`${this.baseUrl}/sessions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        agent: {
          model: config.model || "gpt-4o",
          instructions: config.instructions || "You are a helpful assistant.",
          tools: config.tools || [],
        },
        environment: config.environment || { type: "openai_hosted" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[OpenAI Agents API] HTTP ${res.status}: ${err}`);
    }

    return await res.json();
  }

  /**
   * Run a turn on an existing session
   */
  public async runTurn(
    sessionId: string,
    input: string,
    stream: boolean = false,
  ): Promise<Response> {
    if (!this.isAvailable()) {
      throw new Error("OpenAI API key is not configured.");
    }

    const res = await fetch(`${this.baseUrl}/sessions/${sessionId}/turns`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        input,
        stream,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`[OpenAI Agents API] HTTP ${res.status}: ${err}`);
    }

    return res;
  }
}

// Session cache keyed by threadId
const threadSessionMap = new Map<string, string>();

function extractTurnText(turnData: unknown): string {
  if (typeof turnData === "string") return turnData;
  const anyData = turnData as Record<string, unknown> | undefined;
  if (anyData?.output && Array.isArray(anyData.output)) {
    return (anyData.output as Array<Record<string, unknown> | string>)
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item?.text === "string") return item.text;
        if (item?.content) {
          if (typeof item.content === "string") return item.content;
          if (Array.isArray(item.content)) {
            return (item.content as Array<Record<string, unknown>>)
              .map((c) => (typeof c.text === "string" ? c.text : ""))
              .join("\n");
          }
        }
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  if (typeof anyData?.text === "string") return anyData.text;
  const msg = anyData?.message as Record<string, unknown> | undefined;
  if (typeof msg?.content === "string") return msg.content;
  return JSON.stringify(turnData);
}

/**
 * Executes a turn via the OpenAI Agents API (sessions & turns endpoint)
 */
export async function executeOpenAiAgent(
  threadId: string | undefined,
  message: string,
  systemPrompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onStepFinish?: (event: any) => void | Promise<void>,
) {
  const client = new OpenAiAgentsClient();
  const cacheKey = threadId || "default-session";
  let sessionId = threadSessionMap.get(cacheKey);

  if (!sessionId) {
    const session = await client.createSession({
      model: "gpt-4o",
      instructions: systemPrompt,
    });
    sessionId = session.id;
    threadSessionMap.set(cacheKey, sessionId);
  }

  const res = await client.runTurn(sessionId, message, false);
  const turnData = await res.json();
  const text = extractTurnText(turnData);

  const stepResult = {
    text,
    toolCalls: [],
  };

  if (onStepFinish) {
    await onStepFinish(stepResult);
  }

  return {
    text,
    steps: [stepResult],
  };
}
