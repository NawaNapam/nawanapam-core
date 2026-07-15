import { getPlatformInfo } from "./platform";
import { resolveFeatures, type PlatformFeatures } from "./features";
import { isProduction, isDevelopment } from "./environment";

export type { OS, PlatformInfo } from "./platform";
export type { PlatformFeatures } from "./features";

export interface Platform {
  readonly os: "android" | "ios" | "web";
  readonly isWeb: boolean;
  readonly isNative: boolean;
  readonly isAndroid: boolean;
  readonly isIOS: boolean;
  readonly isCapacitor: boolean;
  readonly isLiveReload: boolean;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly features: PlatformFeatures;
}

/**
 * Single source of truth for platform information. No other module should
 * import `@capacitor/core` or branch on `NODE_ENV` for platform decisions —
 * go through this instead.
 */
export const platform: Platform = {
  get os() {
    return getPlatformInfo().os;
  },
  get isWeb() {
    return getPlatformInfo().isWeb;
  },
  get isNative() {
    return getPlatformInfo().isNative;
  },
  get isAndroid() {
    return getPlatformInfo().isAndroid;
  },
  get isIOS() {
    return getPlatformInfo().isIOS;
  },
  get isCapacitor() {
    return getPlatformInfo().isCapacitor;
  },
  get isLiveReload() {
    return getPlatformInfo().isLiveReload;
  },
  get isProduction() {
    return isProduction;
  },
  get isDevelopment() {
    return isDevelopment;
  },
  get features() {
    return resolveFeatures(getPlatformInfo());
  },
};
