const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

const GMB_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "openid",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getGmbAuthUrl(origin: string, state: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const redirectUri = `${origin}/api/auth/gmb/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMB_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export async function exchangeGmbCode(code: string, redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token exchange failed: ${errText}`);
  }

  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  };
}

export async function refreshGmbToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google token refresh failed: ${errText}`);
  }

  return (await res.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };
}
