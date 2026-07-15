import type { NotificationProvider } from "./NotificationProvider";

/**
 * Thin stub matching the interface honestly: there's no web-push backend yet
 * (no VAPID keys, no `push` handler in the service worker), so `register` and
 * `onNotificationTap` are no-ops rather than fake infrastructure.
 * `requestPermission` is real — harmless, and useful if in-page UI ever wants
 * browser notification permission.
 */
export class WebNotifications implements NotificationProvider {
  async requestPermission(): Promise<boolean> {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  async register(): Promise<void> {
    // No-op: no web-push backend to register a subscription with.
  }

  onNotificationTap(): () => void {
    // No-op: no service worker `notificationclick` wiring exists on web yet.
    return () => {};
  }
}
