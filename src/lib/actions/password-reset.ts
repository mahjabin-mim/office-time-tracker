"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import {
  RESET_REQUEST_COOLDOWN_SECONDS,
  RESET_TOKEN_TTL_MINUTES,
  createResetToken,
  hashResetToken,
  isResetTokenUsable,
  resetPasswordEmail,
} from "@/lib/password-reset";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation";

export type PasswordResetFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  sent?: boolean;
} | null;

function fieldErrorsFrom(issues: { path: (string | number)[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/**
 * Where reset links point. APP_URL is preferred so a spoofed Host header can never redirect
 * someone's reset link to another site.
 */
async function getAppOrigin(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function requestPasswordResetAction(
  _prevState: PasswordResetFormState,
  formData: FormData
): Promise<PasswordResetFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: String(formData.get("email") ?? "") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const recent = await db.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - RESET_REQUEST_COOLDOWN_SECONDS * 1000) },
      },
    });

    if (!recent) {
      // Only the newest link should work.
      await db.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      const { token, tokenHash } = createResetToken();
      await db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
        },
      });

      const link = `${await getAppOrigin()}/reset-password?token=${encodeURIComponent(token)}`;
      await sendMail({ to: user.email, ...resetPasswordEmail(user.name, link) });
    }
  }

  // Same answer whether or not the account exists, so the form can't be used to probe emails.
  return { sent: true };
}

export async function resetPasswordAction(
  _prevState: PasswordResetFormState,
  formData: FormData
): Promise<PasswordResetFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error.issues);
    return fieldErrors.token ? { error: fieldErrors.token } : { fieldErrors };
  }

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(parsed.data.token) },
  });
  if (!record || !isResetTokenUsable(record)) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db.$transaction([
    // A reset signs out every device, in case someone else had access.
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.passwordResetToken.deleteMany({ where: { userId: record.userId, id: { not: record.id } } }),
  ]);

  redirect("/login?reset=1");
}
