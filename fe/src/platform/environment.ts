export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = !isProduction;

export type OS = "android" | "ios" | "web";

export interface DevOverride {
  forceNative: boolean;
  os?: Extract<OS, "android" | "ios">;
}

/**
 * Lets a plain desktop/mobile browser simulate native behavior during
 * development, so auth/storage/share/notification code paths can be exercised
 * without an emulator. Never honored in production builds.
 */
export function getDevOverride(): DevOverride | null {
  if (isProduction) return null;

  // Next.js only inlines NEXT_PUBLIC_* env vars into the client bundle for
  // *static* `process.env.X` access — a dynamic/computed lookup (reading
  // through a variable holding the name) can't be statically analyzed, so it
  // silently resolves to undefined in the browser. Must be spelled out
  // literally here, even though the names are still centralized in
  // constants.ts for anything reading them server-side or via bracket access.
  const forceNative = process.env.NEXT_PUBLIC_FORCE_NATIVE === "true";
  const osOverride = process.env.NEXT_PUBLIC_PLATFORM;
  const os = osOverride === "android" || osOverride === "ios" ? osOverride : undefined;

  if (!forceNative && !os) return null;
  return { forceNative: forceNative || !!os, os };
}
