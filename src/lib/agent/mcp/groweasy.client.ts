import { GrowEasyConnectorService } from "@/lib/services/connector";
import { getSessionFromCookies } from "@/lib/auth/session";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse<T = unknown> {
  jsonrpc: "2.0";
  id: string | number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface McpTool {
  name: string;
  title?: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpListToolsResult {
  tools: McpTool[];
}

export interface McpCallToolResult {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

export class GrowEasyMcpClient {
  private endpoint: string;
  private apiKey: string = "";
  private orgId: string = "";
  private requestId: number = 1;

  constructor(options?: {
    endpoint?: string;
    apiKey?: string;
    orgId?: string;
  }) {
    this.endpoint =
      options?.endpoint ||
      process.env.GROWEASY_MCP_URL ||
      "https://groweasy.ai/api/mcp";

    if (options?.apiKey) {
      this.apiKey = options.apiKey;
    }
    if (options?.orgId) {
      this.orgId = options.orgId;
    }
  }

  private async ensureCredentials() {
    // If already set (or provided in options), keep it
    if (this.apiKey) {
      return;
    }

    // Read active OAuth token from database for the authenticated user
    const session = await getSessionFromCookies().catch(() => null);
    if (!session) {
      throw new Error("Please login before using GrowEasy tools.");
    }

    const conn = await GrowEasyConnectorService.getConnection(session.id);
    if (conn?.accessToken) {
      this.apiKey = conn.accessToken;
      if (conn.orgId) {
        this.orgId = conn.orgId;
      }
      return;
    }

    throw new Error(
      "GrowEasy is not connected. Please connect your GrowEasy account using the Connectors menu before running this action.",
    );
  }

  public setAuthToken(token: string) {
    this.apiKey = token;
  }

  public setOrgId(orgId: string) {
    this.orgId = orgId;
  }

  public getOrgId(): string {
    return this.orgId;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "User-Agent": "GrowEasy-Harness-Agent/1.0",
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    if (this.orgId) {
      headers["x-org-id"] = this.orgId;
    }

    return headers;
  }

  public async sendJsonRpc<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<T> {
    await this.ensureCredentials();
    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: this.requestId++,
      method,
      params,
    };

    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });

    const rawText = await res.text();

    if (!res.ok) {
      let parsedError: unknown;
      try {
        parsedError = JSON.parse(rawText);
      } catch {
        parsedError = rawText;
      }
      throw new Error(
        `[GrowEasy MCP] HTTP ${res.status}: ${
          typeof parsedError === "object"
            ? JSON.stringify(parsedError)
            : parsedError
        }`,
      );
    }

    // Parse SSE or JSON response
    let jsonText = rawText;
    if (rawText.includes("data:")) {
      const dataLine = rawText.split("\n").find((l) => l.startsWith("data:"));
      if (dataLine) {
        jsonText = dataLine.replace(/^data:\s*/, "");
      }
    }

    let json: JsonRpcResponse<T>;
    try {
      json = JSON.parse(jsonText);
    } catch {
      throw new Error(`[GrowEasy MCP] Invalid JSON response: ${rawText}`);
    }

    if (json.error) {
      throw new Error(
        `[GrowEasy MCP Error ${json.error.code}]: ${json.error.message}`,
      );
    }

    return json.result as T;
  }

  public async initialize() {
    return this.sendJsonRpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "groweasy-chief-harness",
        version: "1.0.0",
      },
    });
  }

  public async listTools(): Promise<McpTool[]> {
    const res = await this.sendJsonRpc<McpListToolsResult>("tools/list", {});
    return res?.tools || [];
  }

  public async callTool(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<McpCallToolResult> {
    await this.ensureCredentials();
    const paramsWithOrg = {
      ...(this.orgId ? { org_id: this.orgId } : {}),
      ...args,
    };
    return this.sendJsonRpc<McpCallToolResult>("tools/call", {
      name,
      arguments: paramsWithOrg,
    });
  }

  public async listResources() {
    return this.sendJsonRpc("resources/list", {});
  }
}
