import type { ShareProvider, SharePayload } from "./ShareProvider";

/** Web Share API — feature-detected since only some mobile browsers support file sharing. */
export class WebShare implements ShareProvider {
  canShareFiles(): boolean {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      typeof navigator.canShare === "function"
    );
  }

  async share(payload: SharePayload): Promise<boolean> {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
      return false;
    }

    if (payload.files?.length && !navigator.canShare?.({ files: payload.files })) {
      return false;
    }

    try {
      await navigator.share(payload);
      return true;
    } catch {
      // User cancelled the share sheet or it failed — treat as a no-op.
      return false;
    }
  }
}
