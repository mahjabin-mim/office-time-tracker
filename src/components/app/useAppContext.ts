"use client";

import { useEffect, useState } from "react";
import { detectPlatform, isInstalledApp, type Platform } from "@/lib/platform";

// sessionStorage, not localStorage: the Android app shares Chrome's storage for this site, so a
// persistent flag would also hide the download links in the user's normal browser.
const IN_APP_FLAG = "ott-in-app";

/** Platform and "are we inside the installed app?" — only known after mount, on the client. */
export function useAppContext(): { ready: boolean; inApp: boolean; platform: Platform } {
  const [state, setState] = useState({ ready: false, inApp: false, platform: "desktop" as Platform });

  useEffect(() => {
    let flagged = false;
    try {
      flagged = sessionStorage.getItem(IN_APP_FLAG) === "1";
    } catch {
      // storage can be unavailable (private mode); fall back to the other signals
    }
    const inApp = isInstalledApp({
      displayModeStandalone:
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches,
      iosStandalone: (navigator as Navigator & { standalone?: boolean }).standalone === true,
      referrer: document.referrer,
      search: window.location.search,
      flaggedThisSession: flagged,
    });
    if (inApp) {
      try {
        sessionStorage.setItem(IN_APP_FLAG, "1");
      } catch {
        // ignore
      }
    }
    setState({
      ready: true,
      inApp,
      platform: detectPlatform(navigator.userAgent, navigator.maxTouchPoints),
    });
  }, []);

  return state;
}
