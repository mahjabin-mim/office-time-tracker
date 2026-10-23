import { describe, expect, it } from "vitest";
import { readSessionPayload } from "@/lib/session-payload";

describe("readSessionPayload", () => {
  it("reads the user, session version, and remember flag", () => {
    expect(readSessionPayload({ userId: "u1", v: 3, rem: true })).toEqual({
      userId: "u1",
      version: 3,
      remember: true,
    });
  });

  it("treats cookies issued before versioning as version 0, so nobody is logged out by the upgrade", () => {
    expect(readSessionPayload({ userId: "u1" })).toEqual({ userId: "u1", version: 0, remember: false });
  });

  it("rejects claims without a user id and ignores malformed versions", () => {
    expect(readSessionPayload({})).toBeNull();
    expect(readSessionPayload({ userId: "" })).toBeNull();
    expect(readSessionPayload({ userId: "u1", v: "9" })?.version).toBe(0);
    expect(readSessionPayload({ userId: "u1", v: 1.5 })?.version).toBe(0);
  });
});
