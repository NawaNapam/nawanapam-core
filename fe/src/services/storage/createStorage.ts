import { platform } from "@/platform";
import type { StorageProvider } from "./StorageProvider";
import { NativeStorage } from "./NativeStorage";
import { WebStorage } from "./WebStorage";

export function createStorageProvider(): StorageProvider {
  return platform.features.storage === "preferences" ? new NativeStorage() : new WebStorage();
}

export const storageService: StorageProvider = createStorageProvider();
