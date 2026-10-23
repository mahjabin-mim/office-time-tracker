import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_SCHEDULE, getCurrentUser } from "@/lib/data";
import { createSession } from "@/lib/session";
import {
  GOOGLE_CALLBACK_PATH,
  GOOGLE_OAUTH_COOKIE,
  exchangeGoogleCode,
  type GoogleProfile,
} from "@/lib/google";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const stored = cookieStore.get(GOOGLE_OAUTH_COOKIE)?.value;
  cookieStore.delete({ name: GOOGLE_OAUTH_COOKIE, path: "/api/auth/google" });

  // A signed-in user arriving here came from "Connect Google" in Settings.
  const currentUser = await getCurrentUser();
  const failTo = currentUser ? "/dashboard/settings?google=" : "/login?error=";

  const params = req.nextUrl.searchParams;
  if (params.get("error")) redirect(`${failTo}google_cancelled`);

  let pending: { state: string; codeVerifier: string } | null = null;
  try {
    pending = stored ? JSON.parse(stored) : null;
  } catch {
    pending = null;
  }
  const code = params.get("code");
  if (!code || !pending || pending.state !== params.get("state")) {
    redirect(`${failTo}google_failed`);
  }

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
  if (!profile) redirect(`${failTo}google_failed`);

  const linkedUser = await db.user.findUnique({ where: { googleId: profile.sub } });

  if (currentUser) {
    if (linkedUser && linkedUser.id !== currentUser.id) {
      redirect("/dashboard/settings?google=google_in_use");
    }
    await db.user.update({ where: { id: currentUser.id }, data: { googleId: profile.sub } });
    redirect("/dashboard/settings?google=connected");
  }

  let user = linkedUser;
  if (!user) {
    const byEmail = await db.user.findUnique({ where: { email: profile.email } });
    if (byEmail?.googleId) redirect("/login?error=google_conflict");

    // Google has verified this email, so it's safe to link it to an existing password account.
    user = byEmail
      ? await db.user.update({ where: { id: byEmail.id }, data: { googleId: profile.sub } })
      : await db.user.create({
          data: {
            name: profile.name,
            email: profile.email,
            googleId: profile.sub,
            schedule: { create: DEFAULT_SCHEDULE },
          },
        });
  }

  await createSession(user.id, true);
  redirect("/dashboard");
}
