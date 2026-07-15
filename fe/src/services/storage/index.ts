import type { PersistStorage, StorageValue } from "zustand/middleware";
import { storageService, createStorageProvider } from "./createStorage";

export type { StorageProvider } from "./StorageProvider";
export { createStorageProvider, storageService };

/**
 * Adapts `storageService` (localStorage on web, Capacitor Preferences on
 * native) into zustand's `persist` middleware, so stores never touch
 * `localStorage` directly and get native storage for free on-device.
 */
export function createZustandStorage<S>(): PersistStorage<S> {
  return {
    getItem: (name) => storageService.get<StorageValue<S>>(name),
    setItem: (name, value) => storageService.set(name, value),
    removeItem: (name) => storageService.remove(name),
  };
}
