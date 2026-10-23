export type Platform = "android" | "ios" | "desktop";

/** Stable link to the newest Android build (redirects to the latest GitHub release asset). */
export const ANDROID_APP_URL = "/download/android";

/** The Android app opens the site with ?source=app so pages know they're inside it. */
export const IN_APP_PARAM = "source";
export const IN_APP_VALUE = "app";

export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  // iPadOS 13+ reports itself as a Mac; touch support gives it away.
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  return "desktop";
}

/**
 * Whether the site is running as the installed app (Android TWA, iOS home-screen app, or an
 * installed PWA) rather than in a normal browser tab, where "get the app" links make sense.
 */
export function isInstalledApp(context: {
  displayModeStandalone: boolean;
  iosStandalone: boolean;
  referrer: string;
  search: string;
  flaggedThisSession: boolean;
}): boolean {
  return (
    context.displayModeStandalone ||
    context.iosStandalone ||
    context.flaggedThisSession ||
    context.referrer.startsWith("android-app://") ||
    new URLSearchParams(context.search).get(IN_APP_PARAM) === IN_APP_VALUE
  );
}
