import type { NextRequest } from "next/server";
import {
  createMobileToken,
  json,
  readBody,
  redeemAppSignInCode,
  serializeUser,
  str,
} from "@/lib/mobile-api";

/** Trades the code from a Google sign-in (see /api/auth/google?app_challenge=) for a token. */
export async function POST(req: NextRequest) {
  const body = await readBody(req);
  const user = await redeemAppSignInCode(str(body.code), str(body.verifier));
  if (!user) return json({ error: "Google sign-in expired. Please try again." }, 422);

  return json({ token: await createMobileToken(user), user: serializeUser(user) });
}
