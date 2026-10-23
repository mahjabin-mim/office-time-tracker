import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { destroySession } from "@/lib/session";

/** Clears a session cookie that's no longer valid (revoked or for a deleted account). */
export async function GET() {
  if (await getAuthenticatedUser()) redirect("/dashboard");
  await destroySession();
  redirect("/login?expired=1");
}
