import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

/** Short-lived cookie holding the OAuth `state` and PKCE verifier between redirect and callback. */
export const GOOGLE_OAUTH_COOKIE = "ott_google_oauth";
export const GOOGLE_CALLBACK_PATH = "/api/auth/google/callback";

/** What the OAuth cookie holds. appChallenge is set when a native app started the sign-in. */
export type PendingGoogleAuth = {
  state: string;
  codeVerifier: string;
  appChallenge?: string;
};

export type GoogleProfile = {
  sub: string;
  email: string;
  name: string;
};

export function isGoogleAuthEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function randomToken(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
}

export async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Buffer.from(digest).toString("base64url");
}

export async function createGoogleAuthRequest(redirectUri: string) {
  const state = randomToken();
  const codeVerifier = randomToken();

  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: await sha256Base64Url(codeVerifier),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();

  return { url: url.toString(), state, codeVerifier };
}

/** Exchanges the authorization code for an ID token and returns the verified Google profile. */
export async function exchangeGoogleCode(params: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<GoogleProfile | null> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: params.code,
      code_verifier: params.codeVerifier,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: params.redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;

  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) return null;

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });

  if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
  if (payload.email_verified !== true) return null;

  const email = payload.email.toLowerCase();
  const name =
    typeof payload.name === "string" && payload.name.trim()
      ? payload.name.trim()
      : email.split("@")[0];
  return { sub: payload.sub, email, name };
}

export const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "Couldn't sign in with Google. Please try again.",
  google_unavailable:
    "Google sign-in isn't set up yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the server environment.",
  google_in_use: "That Google account is already linked to another Office Time Tracker account.",
  google_conflict: "This email is already linked to a different Google account.",
};
