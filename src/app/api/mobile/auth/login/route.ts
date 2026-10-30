import type { NextRequest } from "next/server";
import { verifyPasswordLogin } from "@/lib/account-service";
import { getClientIp } from "@/lib/login-attempts";
import { createMobileToken, json, readBody, serializeUser, str } from "@/lib/mobile-api";

export async function POST(req: NextRequest) {
  const body = await readBody(req);
  const result = await verifyPasswordLogin(
    { email: str(body.email), password: str(body.password), remember: true },
    await getClientIp()
  );
  if (!("user" in result)) return json(result, 422);

  return json({ token: await createMobileToken(result.user), user: serializeUser(result.user) });
}
