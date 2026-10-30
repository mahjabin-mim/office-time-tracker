import "server-only";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { DEFAULT_SCHEDULE } from "@/lib/data";
import { checkLoginAllowed, clearFailedLogins, recordFailedLogin } from "@/lib/login-attempts";
import { isValidTimeZone } from "@/lib/time";
import { loginSchema, signupSchema } from "@/lib/validation";

/** Shared by the web forms and the mobile API, so both sign in with the same rules and limits. */
export type AccountResult =
  | { user: User; remember: boolean }
  | { error?: string; fieldErrors?: Record<string, string> };

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export async function createPasswordAccount(raw: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  timezone: string;
}): Promise<AccountResult> {
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return {
      fieldErrors: {
        email: existing.passwordHash
          ? "An account with this email already exists"
          : "This email is registered with Google. Use \"Continue with Google\" instead.",
      },
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      timezone: raw.timezone && isValidTimeZone(raw.timezone) ? raw.timezone : null,
      schedule: { create: DEFAULT_SCHEDULE },
    },
  });
  return { user, remember: false };
}

export async function verifyPasswordLogin(
  raw: { email: string; password: string; remember: boolean },
  ip: string
): Promise<AccountResult> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const { email } = parsed.data;

  // Checked before the password, so a locked account can't be probed further.
  const lock = await checkLoginAllowed(email, ip);
  if (lock.locked) {
    const minutes = lock.retryAfterMinutes;
    return {
      error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}, or reset your password.`,
    };
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    await recordFailedLogin(email, ip);
    return { error: "Invalid email or password" };
  }
  if (!user.passwordHash) {
    return { error: "This account signs in with Google. Use \"Continue with Google\" instead." };
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    await recordFailedLogin(email, ip);
    return { error: "Invalid email or password" };
  }

  await clearFailedLogins(email);
  return { user, remember: parsed.data.remember };
}
