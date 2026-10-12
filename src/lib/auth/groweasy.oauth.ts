import crypto from "crypto";

const GROWEASY_MCP_BASE =
  process.env.GROWEASY_MCP_URL?.replace(/\/+$/, "") || "https://groweasy.ai/api/mcp";

interface ClientRegistration {
  client_id: string;
  redirect_uris: string[];
  client_name: string;
}

// In-memory cache for registered client IDs per redirect URI
const clientRegistrationCache = new Map<string, string>();

/**
 * Generate PKCE code verifier and code challenge (S256)
 */
export function generatePkce() {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  const state = crypto.randomBytes(24).toString("hex");

  return { verifier, challenge, state };
}

/**
 * Dynamically register a client for the given redirectUri using RFC 7591
 */
export async function getOrCreateClientId(redirectUri: string): Promise<string> {
  if (clientRegistrationCache.has(redirectUri)) {
    return clientRegistrationCache.get(redirectUri)!;
  }

  try {
    const res = await fetch(`${GROWEASY_MCP_BASE}/oauth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "GrowEasy-Harness/1.0",
      },
      body: JSON.stringify({
        client_name: "GrowEasy Harness",
        redirect_uris: [redirectUri],
        token_endpoint_auth_method: "none",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(
        `[GrowEasy OAuth] Dynamic client registration failed: ${res.status} ${errText}`
      );
      // Fallback to default registered ID
      return "58f264d6-eab7-492c-a58c-90af68453330";
    }

    const data: ClientRegistration = await res.json();
    if (data.client_id) {
      clientRegistrationCache.set(redirectUri, data.client_id);
      return data.client_id;
    }
  } catch (err) {
    console.error("[GrowEasy OAuth] Error during client registration:", err);
  }

  return "58f264d6-eab7-492c-a58c-90af68453330";
}

/**
 * Exchange authorization code for an OAuth access token
 */
export async function exchangeCodeForToken(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}): Promise<{
  access_token: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
}> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_verifier: params.codeVerifier,
  });

  const res = await fetch(`${GROWEASY_MCP_BASE}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "GrowEasy-Harness/1.0",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    let errorJson;
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      errorJson = { error: errorText };
    }
    throw new Error(
      `Failed to exchange OAuth token: ${
        errorJson.error_description || errorJson.error || errorText
      }`
    );
  }

  return res.json();
}
