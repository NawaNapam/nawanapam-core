import type { PlatformInfo } from "./platform";

export interface PlatformFeatures {
  auth: "native" | "web";
  storage: "preferences" | "local";
  notifications: boolean;
  sharing: "native" | "web";
  browserOAuth: boolean;
}

/** Derives which service implementation each area of the app should use. */
export function resolveFeatures(info: PlatformInfo): PlatformFeatures {
  return {
    auth: info.isNative ? "native" : "web",
    storage: info.isNative ? "preferences" : "local",
    notifications: true,
    sharing: info.isNative ? "native" : "web",
    browserOAuth: !info.isNative,
  };
}
