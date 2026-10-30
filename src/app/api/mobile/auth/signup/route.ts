import type { NextRequest } from "next/server";
import { createPasswordAccount } from "@/lib/account-service";
import { createMobileToken, json, readBody, serializeUser, str } from "@/lib/mobile-api";

export async function POST(req: NextRequest) {
  const body = await readBody(req);
  const result = await createPasswordAccount({
    name: str(body.name),
    email: str(body.email),
    password: str(body.password),
    confirmPassword: str(body.confirmPassword),
    timezone: str(body.timezone),
  });
  if (!("user" in result)) return json(result, 422);

  return json({ token: await createMobileToken(result.user), user: serializeUser(result.user) });
}
