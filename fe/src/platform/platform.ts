import { Capacitor } from "@capacitor/core";
import { getDevOverride, type OS } from "./environment";

export type { OS };

export interface PlatformInfo {
  os: OS;
  isNative: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isWeb: boolean;
  /** True whenever the real Capacitor native bridge is present, ignoring dev overrides. */
  isCapacitor: boolean;
  /** Native app still pointed at a `next dev` server instead of bundled assets. */
  isLiveReload: boolean;
}

/**
 * The only place in the app allowed to touch `Capacitor.isNativePlatform()` /
 * `Capacitor.getPlatform()` directly. Everything else imports from
 * `@/platform`.
 *
 * `isNativePlatform()` checks for the bridge Capacitor's native runtime injects
 * into the WebView, not the URL — so it already reports `true` correctly under
 * Live Reload. `isLiveReload` layers a protocol check on top *after* confirming
 * we're native, to distinguish a dev server (`http://<lan-ip>:3000`) from a
 * bundled production build (`https://localhost` / `capacitor://localhost`).
 */
function computePlatformInfo(): PlatformInfo {
  const override = getDevOverride();
  const isCapacitor = Capacitor.isNativePlatform();
  const isNative = override?.forceNative ?? isCapacitor;

  const os: OS = isNative
    ? override?.os ?? (Capacitor.getPlatform() as OS)
    : "web";

  const isLiveReload =
    isNative &&
    typeof window !== "undefined" &&
    window.location.protocol === "http:";

  return {
    os,
    isNative,
    isAndroid: os === "android",
    isIOS: os === "ios",
    isWeb: !isNative,
    isCapacitor,
    isLiveReload,
  };
}

let cached: PlatformInfo | null = null;

/** Computed once per session (the underlying runtime never changes mid-session). */
export function getPlatformInfo(): PlatformInfo {
  if (!cached) cached = computePlatformInfo();
  return cached;
}
