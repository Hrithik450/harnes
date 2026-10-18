import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { UserRecord } from "@/lib/drizzle/schema";
import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "groweasy-session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

const JWT_EXPIRY = "7d";

export type SessionUser = UserRecord;

function getAuthSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET!;
  return new TextEncoder().encode(secret);
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  };
}

/**
 * Signs a short-lived JWT embedding the session user.
 */
export async function createSession(user: UserRecord): Promise<string> {
  const secret = getAuthSecretKey();
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);
}

/**
 * Verifies a session JWT and returns the embedded user, or null if invalid/expired.
 */
export async function verifySession(token: string): Promise<UserRecord | null> {
  const secret = getAuthSecretKey();
  try {
    const { payload } = await jwtVerify(token, secret);
    const u = (payload as { user: UserRecord }).user;
    if (!u) return null;
    return u;
  } catch {
    return null;
  }
}

/**
 * Sets the session cookie using Next.js cookies() API.
 */
export async function setSessionCookie(user: UserRecord): Promise<void> {
  const token = await createSession(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

/**
 * Attaches the session cookie onto a NextResponse.
 */
export async function attachSessionCookie<T extends NextResponse>(
  response: T,
  user: UserRecord,
): Promise<T> {
  const token = await createSession(user);
  response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
  return response;
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Reads and verifies the current session user from incoming cookies.
 */
export async function getSessionFromCookies(): Promise<UserRecord | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

/**
 * Reads and verifies session from a NextRequest object.
 */
export async function getSessionFromRequest(
  req: NextRequest,
): Promise<UserRecord | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}
