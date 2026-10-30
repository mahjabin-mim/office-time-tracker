import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import {
  GOOGLE_CALLBACK_PATH,
  GOOGLE_OAUTH_COOKIE,
  createGoogleAuthRequest,
  isGoogleAuthEnabled,
  type PendingGoogleAuth,
} from "@/lib/google";
import { APP_CHALLENGE_PATTERN, appRedirect } from "@/lib/mobile-api";

export async function GET(req: NextRequest) {
  // Set when the iOS or Android app opens this in a browser sheet (see lib/mobile-api).
  const appChallenge = req.nextUrl.searchParams.get("app_challenge") ?? undefined;
  if (appChallenge !== undefined && !APP_CHALLENGE_PATTERN.test(appChallenge)) {
    return appRedirect({ error: "google_failed" });
  }

  if (!isGoogleAuthEnabled()) {
    if (appChallenge) return appRedirect({ error: "google_unavailable" });
    const session = await getSession();
    redirect(session ? "/dashboard/settings?google=google_unavailable" : "/login?error=google_unavailable");
  }

  const { url, state, codeVerifier } = await createGoogleAuthRequest(
    `${req.nextUrl.origin}${GOOGLE_CALLBACK_PATH}`
  );

  const pending: PendingGoogleAuth = { state, codeVerifier, appChallenge };
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_COOKIE, JSON.stringify(pending), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 60 * 10,
  });

  redirect(url);
}
