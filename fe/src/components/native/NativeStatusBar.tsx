"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { platform } from "@/platform";

const LIGHT_BG = "#ffffff";
const DARK_BG = "#181d26";

/**
 * Keeps the native Android status/nav bar in sync with the site's theme.
 * Without this the system bars keep Capacitor's default light background,
 * which clashes with the app (most visibly on the always-dark /chat call UI).
 */
export default function NativeStatusBar() {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();

  // Android 15+ (targetSdk 36) forces edge-to-edge, so the WebView always
  // draws under the status bar and `overlaysWebView`/`backgroundColor` are
  // no-ops. Read the real height once and expose it as a CSS var so layouts
  // (e.g. Header.tsx) can pad around it instead of being hidden behind it.
  useEffect(() => {
    if (!platform.isNative) return;

    import("@capacitor/status-bar").then(({ StatusBar }) => {
      StatusBar.getInfo().then(({ height }) => {
        document.documentElement.style.setProperty("--status-bar-height", `${height}px`);
      });
    });
  }, []);

  useEffect(() => {
    if (!platform.isNative) return;

    // The call screen is always rendered dark regardless of the site theme.
    const isDark = pathname?.startsWith("/chat") || resolvedTheme === "dark";
    const backgroundColor = isDark ? DARK_BG : LIGHT_BG;

    import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
      // No-ops on Android 15+, but harmless, and still works pre-15/iOS.
      StatusBar.setBackgroundColor({ color: backgroundColor });
      // Style.Dark = light icons (for a dark background); Style.Light = dark icons.
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    });
  }, [resolvedTheme, pathname]);

  return null;
}
