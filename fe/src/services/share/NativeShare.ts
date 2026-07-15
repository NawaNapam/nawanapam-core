import { Share } from "@capacitor/share";
import { Filesystem, Directory } from "@capacitor/filesystem";
import type { ShareProvider, SharePayload } from "./ShareProvider";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result is a "data:<mime>;base64,<data>" URL — Filesystem wants just the data.
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Capacitor's Share plugin only accepts `file://` URIs, not raw Blobs/Files,
 * so files are written to the cache directory first via Filesystem, then
 * shared by URI.
 */
export class NativeShare implements ShareProvider {
  canShareFiles(): boolean {
    return true;
  }

  async share(payload: SharePayload): Promise<boolean> {
    const fileUris = payload.files?.length
      ? await Promise.all(payload.files.map((file) => this.writeToCache(file)))
      : undefined;

    try {
      await Share.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
        files: fileUris,
      });
      return true;
    } catch {
      // User cancelled the share sheet or it failed — treat as a no-op.
      return false;
    }
  }

  private async writeToCache(file: File): Promise<string> {
    const base64 = await blobToBase64(file);
    const { uri } = await Filesystem.writeFile({
      path: file.name,
      data: base64,
      directory: Directory.Cache,
    });
    return uri;
  }
}
