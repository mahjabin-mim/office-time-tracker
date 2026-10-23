import "server-only";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/**
 * The signed-in user, or null when there's no valid session or it has been revoked (password
 * changed or reset, or "Log out of all devices").
 */
export async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user || user.sessionVersion !== session.version) return null;
  return user;
}

/** For Server Actions: the signed-in user's id, or an error if the session isn't valid. */
export async function requireUserId(): Promise<string> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}
