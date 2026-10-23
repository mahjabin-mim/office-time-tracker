import { describe, expect, it } from "vitest";
import { detectPlatform, isInstalledApp } from "@/lib/platform";

const UA = {
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
  mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15",
  windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36",
};

describe("detectPlatform", () => {
  it("recognises Android, iPhone, and desktops", () => {
    expect(detectPlatform(UA.android)).toBe("android");
    expect(detectPlatform(UA.iphone)).toBe("ios");
    expect(detectPlatform(UA.windows)).toBe("desktop");
    expect(detectPlatform(UA.mac, 0)).toBe("desktop");
  });

  it("treats a touch-screen 'Mac' as an iPad", () => {
    expect(detectPlatform(UA.mac, 5)).toBe("ios");
  });
});

describe("isInstalledApp", () => {
  const browser = {
    displayModeStandalone: false,
    iosStandalone: false,
    referrer: "",
    search: "",
    flaggedThisSession: false,
  };

  it("is false in a normal browser tab", () => {
    expect(isInstalledApp(browser)).toBe(false);
    expect(isInstalledApp({ ...browser, search: "?source=newsletter" })).toBe(false);
  });

  it("detects the Android app, iOS home-screen app, and installed PWAs", () => {
    expect(isInstalledApp({ ...browser, search: "?source=app" })).toBe(true);
    expect(
      isInstalledApp({ ...browser, referrer: "android-app://app.vercel.officetimetracker.twa/" })
    ).toBe(true);
    expect(isInstalledApp({ ...browser, iosStandalone: true })).toBe(true);
    expect(isInstalledApp({ ...browser, displayModeStandalone: true })).toBe(true);
    expect(isInstalledApp({ ...browser, flaggedThisSession: true })).toBe(true);
  });
});
