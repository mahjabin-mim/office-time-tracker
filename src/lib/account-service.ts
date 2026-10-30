import "server-only";
import bcrypt from "bcryptjs";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import type { GoogleProfile } from "@/lib/google";
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

/** The account for a Google sign-in: the one linked to it, or one created or linked by email. */
export async function findOrCreateGoogleUser(
  profile: GoogleProfile
): Promise<{ user: User } | { error: "google_conflict" }> {
  const linkedUser = await db.user.findUnique({ where: { googleId: profile.sub } });
  if (linkedUser) return { user: linkedUser };

  const byEmail = await db.user.findUnique({ where: { email: profile.email } });
  if (byEmail?.googleId) return { error: "google_conflict" };

  // Google has verified this email, so it's safe to link it to an existing password account.
  const user = byEmail
    ? await db.user.update({ where: { id: byEmail.id }, data: { googleId: profile.sub } })
    : await db.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          googleId: profile.sub,
          schedule: { create: DEFAULT_SCHEDULE },
        },
      });
  return { user };
}
