import { Toast } from "@capacitor/toast";
import type { ToastProvider, ToastOptions } from "./ToastProvider";

/**
 * The system Toast has no color/variant styling (it's a plain OS pill), so a
 * short glyph carries the severity instead. Duration is bucketed into
 * Android's short/long since the plugin doesn't accept exact milliseconds.
 */
function show(glyph: string, message: string, options?: ToastOptions): void {
  const text = options?.description
    ? `${glyph} ${message} — ${options.description}`
    : `${glyph} ${message}`;

  Toast.show({
    text,
    duration: options?.duration && options.duration > 3000 ? "long" : "short",
    position: "bottom",
  });
}

export class NativeToast implements ToastProvider {
  success(message: string, options?: ToastOptions): void {
    show("✓", message, options);
  }

  error(message: string, options?: ToastOptions): void {
    show("⚠", message, options);
  }

  info(message: string, options?: ToastOptions): void {
    show("!", message, options);
  }
}
