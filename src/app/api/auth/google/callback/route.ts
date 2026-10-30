import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/data";
import { createSession } from "@/lib/session";
import { findOrCreateGoogleUser } from "@/lib/account-service";
import { appRedirect, createAppSignInCode } from "@/lib/mobile-api";
import {
  GOOGLE_CALLBACK_PATH,
  GOOGLE_OAUTH_COOKIE,
  exchangeGoogleCode,
  type GoogleProfile,
  type PendingGoogleAuth,
} from "@/lib/google";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const stored = cookieStore.get(GOOGLE_OAUTH_COOKIE)?.value;
  cookieStore.delete({ name: GOOGLE_OAUTH_COOKIE, path: "/api/auth/google" });

  let pending: PendingGoogleAuth | null = null;
  try {
    pending = stored ? JSON.parse(stored) : null;
  } catch {
    pending = null;
  }

  // A native app's sign-in goes back to the app, whoever is signed in to the website in this
  // browser.
  const appChallenge = pending?.appChallenge;
  // A signed-in user arriving here from the website came from "Connect Google" in Settings.
  const currentUser = appChallenge ? null : await getCurrentUser();
  const failTo = currentUser ? "/dashboard/settings?google=" : "/login?error=";
  const fail = (error: string): Response =>
    appChallenge ? appRedirect({ error }) : redirect(`${failTo}${error}`);

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail("google_cancelled");

  const code = params.get("code");
  if (!code || !pending || pending.state !== params.get("state")) return fail("google_failed");

  let profile: GoogleProfile | null = null;
  try {
    profile = await exchangeGoogleCode({
      code,
      codeVerifier: pending.codeVerifier,
      redirectUri: `${req.nextUrl.origin}${GOOGLE_CALLBACK_PATH}`,
    });
  } catch {
    profile = null;
  }
  if (!profile) return fail("google_failed");

  if (currentUser) {
    const linkedUser = await db.user.findUnique({ where: { googleId: profile.sub } });
    if (linkedUser && linkedUser.id !== currentUser.id) {
      redirect("/dashboard/settings?google=google_in_use");
    }
    await db.user.update({ where: { id: currentUser.id }, data: { googleId: profile.sub } });
    redirect("/dashboard/settings?google=connected");
  }

  const result = await findOrCreateGoogleUser(profile);
  if ("error" in result) return fail(result.error);

  if (appChallenge) {
    return appRedirect({ code: await createAppSignInCode(result.user, appChallenge) });
  }

  await createSession(result.user, true);
  redirect("/dashboard");
}
