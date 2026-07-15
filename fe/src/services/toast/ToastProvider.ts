export interface ToastOptions {
  /** Milliseconds. Web renders this exactly; native buckets it into short/long. */
  duration?: number;
  description?: string;
}

/** Success/error/info messaging, native-toast on device instead of a web overlay. */
export interface ToastProvider {
  success(message: string, options?: ToastOptions): void;
  error(message: string, options?: ToastOptions): void;
  info(message: string, options?: ToastOptions): void;
}
