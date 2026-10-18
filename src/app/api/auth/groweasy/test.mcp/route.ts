import { NextRequest, NextResponse } from "next/server";
import { GrowEasyConnectorService } from "@/lib/services/connector";
import { getSessionFromRequest } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  let token = request.cookies.get("ge_access_token")?.value;
  let orgId = "";

  // Check database if not in request cookies
  if (!token && session) {
    const conn = await GrowEasyConnectorService.getConnection(session.id);
    if (conn?.accessToken) {
      token = conn.accessToken;
      if (conn.orgId) {
        orgId = conn.orgId;
      }
    }
  }

  if (!token) {
    return NextResponse.json(
      {
        error:
          "No GrowEasy access token available. Please authenticate via connectors menu.",
      },
      { status: 401 },
    );
  }

  const endpoint =
    process.env.GROWEASY_MCP_URL?.replace(/\/+$/, "") ||
    "https://groweasy.ai/api/mcp";

  async function callMcp(
    method: string,
    params: Record<string, unknown> = {},
    id = 1,
  ) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${token}`,
        "x-org-id": orgId,
        "User-Agent": "GrowEasy-Harness-Tester/1.0",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id,
        method,
        params,
      }),
    });

    const text = await res.text();
    let jsonText = text;
    if (text.includes("data:")) {
      const line = text.split("\n").find((l) => l.startsWith("data:"));
      if (line) {
        jsonText = line.replace(/^data:\s*/, "");
      }
    }

    let json: unknown;
    try {
      json = JSON.parse(jsonText);
    } catch {
      json = { raw: text };
    }

    return {
      status: res.status,
      ok: res.ok,
      data: json,
    };
  }

  try {
    const [initRes, toolsRes, resourcesRes, promptsRes] = await Promise.all([
      callMcp(
        "initialize",
        {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "harness-test-suite", version: "1.0.0" },
        },
        1,
      ),
      callMcp("tools/list", {}, 2),
      callMcp("resources/list", {}, 3),
      callMcp("prompts/list", {}, 4),
    ]);

    return NextResponse.json({
      tokenPreview: token.slice(0, 10) + "..." + token.slice(-6),
      orgId,
      results: {
        initialize: initRes,
        tools: toolsRes,
        resources: resourcesRes,
        prompts: promptsRes,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "test_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
