import { afterEach, describe, expect, it, vi } from "vitest";
import { getSessionSecret } from "@/lib/session-secret";

describe("getSessionSecret", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses SESSION_SECRET when it is set", () => {
    vi.stubEnv("SESSION_SECRET", "a-real-secret");
    expect(new TextDecoder().decode(getSessionSecret())).toBe("a-real-secret");
  });

  it("refuses the public fallback in production", () => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(() => getSessionSecret()).toThrow(/SESSION_SECRET/);
  });

  it("allows the fallback during development", () => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(getSessionSecret().length).toBeGreaterThan(0);
  });
});
