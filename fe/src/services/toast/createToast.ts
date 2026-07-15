import { platform } from "@/platform";
import type { ToastProvider } from "./ToastProvider";
import { NativeToast } from "./NativeToast";
import { WebToast } from "./WebToast";

export function createToastProvider(): ToastProvider {
  return platform.isNative ? new NativeToast() : new WebToast();
}

export const toast: ToastProvider = createToastProvider();
