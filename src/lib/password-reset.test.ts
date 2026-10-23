import { describe, expect, it } from "vitest";
import {
  createResetToken,
  hashResetToken,
  isResetTokenUsable,
  resetPasswordEmail,
} from "@/lib/password-reset";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation";

describe("reset tokens", () => {
  it("creates unique URL-safe tokens and stores only their hash", () => {
    const a = createResetToken();
    const b = createResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.tokenHash).toBe(hashResetToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
    expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("works once and only before it expires", () => {
    const now = new Date("2026-10-23T10:00:00Z");
    const later = new Date("2026-10-23T11:00:00Z");
    expect(isResetTokenUsable({ expiresAt: later, usedAt: null }, now)).toBe(true);
    expect(isResetTokenUsable({ expiresAt: later, usedAt: now }, now)).toBe(false);
    expect(isResetTokenUsable({ expiresAt: now, usedAt: null }, now)).toBe(false);
    expect(isResetTokenUsable(null, now)).toBe(false);
  });
});

describe("resetPasswordEmail", () => {
  it("includes the link in both versions and escapes the name in HTML", () => {
    const link = "https://officetimetracker.vercel.app/reset-password?token=abc";
    const email = resetPasswordEmail("<Mim>", link);
    expect(email.subject).toMatch(/reset/i);
    expect(email.text).toContain(link);
    expect(email.html).toContain(`href="${link}"`);
    expect(email.html).toContain("&#60;Mim&#62;");
    expect(email.html).not.toContain("<Mim>");
  });
});

describe("reset schemas", () => {
  it("validates the request email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
    const ok = forgotPasswordSchema.safeParse({ email: " Me@Example.com " });
    expect(ok.success && ok.data.email).toBe("me@example.com");
  });

  it("needs a token and a matching new password of 8+ characters", () => {
    const base = { token: "x".repeat(43), password: "newpassword", confirmPassword: "newpassword" };
    expect(resetPasswordSchema.safeParse(base).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...base, token: "" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ ...base, confirmPassword: "other" }).success).toBe(false);
    expect(
      resetPasswordSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success
    ).toBe(false);
  });
});
