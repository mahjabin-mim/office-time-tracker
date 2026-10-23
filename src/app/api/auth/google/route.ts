import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import {
  GOOGLE_CALLBACK_PATH,
  GOOGLE_OAUTH_COOKIE,
  createGoogleAuthRequest,
  isGoogleAuthEnabled,
} from "@/lib/google";

export async function GET(req: NextRequest) {
  if (!isGoogleAuthEnabled()) {
    const session = await getSession();
    redirect(session ? "/dashboard/settings?google=google_unavailable" : "/login?error=google_unavailable");
  }

  const { url, state, codeVerifier } = await createGoogleAuthRequest(
    `${req.nextUrl.origin}${GOOGLE_CALLBACK_PATH}`
  );

  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_OAUTH_COOKIE, JSON.stringify({ state, codeVerifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 60 * 10,
  });

  redirect(url);
}
