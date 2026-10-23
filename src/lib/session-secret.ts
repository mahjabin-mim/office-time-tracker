// Shared by the server session code and the middleware, so it must stay edge-safe.
const DEV_FALLBACK = "dev-only-secret-change-me-please-32-bytes-min";

/**
 * Key that signs session cookies. The fallback is public (it's in this repo), so production
 * refuses to start signing or verifying sessions without a real SESSION_SECRET.
 */
export function getSessionSecret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production");
    }
    return new TextEncoder().encode(DEV_FALLBACK);
  }
  return new TextEncoder().encode(value);
}
