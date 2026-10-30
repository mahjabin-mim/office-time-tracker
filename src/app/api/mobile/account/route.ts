import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { deleteAccountSchema } from "@/lib/validation";
import { json, readBody, str, withMobileUser } from "@/lib/mobile-api";

/** Signs out every device, including this one, by revoking all sessions and tokens. */
export const POST = withMobileUser(async (req, user) => {
  const body = await readBody(req);
  if (body.action !== "logout-all") return json({ error: "Unknown action" }, 400);
  await db.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
  return json({ success: true });
});

/** Deletes the account and all its data (attendance and schedule cascade with the user). */
export const DELETE = withMobileUser(async (req, user) => {
  const body = await readBody(req);
  const parsed = deleteAccountSchema.safeParse({
    confirmation: str(body.confirmation).trim(),
    password: str(body.password),
  });
  if (!parsed.success) {
    return json({ fieldErrors: { confirmation: 'Type "DELETE" to confirm' } }, 422);
  }

  if (user.passwordHash) {
    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) return json({ fieldErrors: { password: "Password is incorrect" } }, 422);
  }

  await db.user.delete({ where: { id: user.id } });
  return json({ success: true });
});
