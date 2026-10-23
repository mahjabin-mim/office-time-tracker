export type SessionPayload = {
  userId: string;
  /** Must match User.sessionVersion; a lower number means the session was revoked. */
  version: number;
  /** Whether the user ticked "Remember me", so a re-issued cookie keeps the same lifetime. */
  remember: boolean;
};

/** Reads a verified session JWT's claims. Cookies issued before versioning count as version 0. */
export function readSessionPayload(claims: Record<string, unknown>): SessionPayload | null {
  if (typeof claims.userId !== "string" || !claims.userId) return null;
  const version = typeof claims.v === "number" && Number.isInteger(claims.v) ? claims.v : 0;
  return { userId: claims.userId, version, remember: claims.rem === true };
}
