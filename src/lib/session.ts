import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSessionSecret } from "@/lib/session-secret";
import { readSessionPayload, type SessionPayload } from "@/lib/session-payload";

export type { SessionPayload } from "@/lib/session-payload";

const SESSION_COOKIE = "ott_session";

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const DEFAULT_MAX_AGE = 60 * 60 * 24; // 1 day

export async function createSession(
  user: { id: string; sessionVersion: number },
  remember: boolean
) {
  const maxAge = remember ? REMEMBER_MAX_AGE : DEFAULT_MAX_AGE;
  const token = await new SignJWT({ userId: user.id, v: user.sessionVersion, rem: remember })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAge)
    .sign(getSessionSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

/**
 * The session cookie's verified contents. This only proves the cookie is genuine and unexpired;
 * use getAuthenticatedUser() (lib/auth) to also reject sessions that were revoked.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    // App tokens and sign-in codes (lib/mobile-api) share the key but carry an audience; none of
    // them may stand in for a session cookie.
    if (payload.aud !== undefined) return null;
    return readSessionPayload(payload);
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
}
