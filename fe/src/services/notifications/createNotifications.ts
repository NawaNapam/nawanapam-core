import { platform } from "@/platform";
import type { NotificationProvider } from "./NotificationProvider";
import { NativeNotifications } from "./NativeNotifications";
import { WebNotifications } from "./WebNotifications";

export function createNotificationProvider(): NotificationProvider {
  return platform.isNative ? new NativeNotifications() : new WebNotifications();
}

export const notificationService: NotificationProvider = createNotificationProvider();
