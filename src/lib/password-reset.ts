import { createHash, randomBytes } from "node:crypto";

/** How long a reset link works. */
export const RESET_TOKEN_TTL_MINUTES = 60;
/** Minimum gap between reset emails for one account, to stop inbox flooding. */
export const RESET_REQUEST_COOLDOWN_SECONDS = 60;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** A random URL-safe token for the email link, plus the hash that gets stored. */
export function createResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

export function isResetTokenUsable(
  record: { expiresAt: Date; usedAt: Date | null } | null,
  now: Date = new Date()
): boolean {
  return record != null && record.usedAt == null && record.expiresAt > now;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function resetPasswordEmail(name: string, link: string) {
  const subject = "Reset your Office Time Tracker password";
  const text = [
    `Hi ${name},`,
    "",
    "Someone (hopefully you) asked to reset your Office Time Tracker password.",
    `Open this link to choose a new one. It works once and expires in ${RESET_TOKEN_TTL_MINUTES} minutes:`,
    "",
    link,
    "",
    "If you didn't ask for this, you can ignore this email. Your password won't change.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f4f2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1d1b2e">
    <div style="max-width:480px;margin:0 auto;padding:32px 20px">
      <div style="background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e6e2f5">
        <p style="margin:0 0 8px;font-size:13px;color:#6a2ff5;font-weight:600">Office Time Tracker</p>
        <h1 style="margin:0 0 16px;font-size:22px">Reset your password</h1>
        <p style="margin:0 0 16px;line-height:1.5">Hi ${escapeHtml(name)}, someone (hopefully you) asked to reset your password. The link works once and expires in ${RESET_TOKEN_TTL_MINUTES} minutes.</p>
        <p style="margin:24px 0">
          <a href="${escapeHtml(link)}" style="display:inline-block;background:#6a2ff5;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:12px">Choose a new password</a>
        </p>
        <p style="margin:0;font-size:13px;color:#6b6880;line-height:1.5">If you didn't ask for this, ignore this email. Your password won't change.</p>
      </div>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}
