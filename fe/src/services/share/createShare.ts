import { platform } from "@/platform";
import type { ShareProvider } from "./ShareProvider";
import { NativeShare } from "./NativeShare";
import { WebShare } from "./WebShare";

export function createShareProvider(): ShareProvider {
  return platform.features.sharing === "native" ? new NativeShare() : new WebShare();
}

export const shareService: ShareProvider = createShareProvider();
