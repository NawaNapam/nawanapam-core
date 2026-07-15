import { toast as sonnerToast } from "sonner";
import type { ToastProvider, ToastOptions } from "./ToastProvider";

export class WebToast implements ToastProvider {
  success(message: string, options?: ToastOptions): void {
    sonnerToast.success(message, options);
  }

  error(message: string, options?: ToastOptions): void {
    sonnerToast.error(message, options);
  }

  info(message: string, options?: ToastOptions): void {
    sonnerToast.info(message, options);
  }
}
