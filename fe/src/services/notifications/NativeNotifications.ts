import type { NotificationProvider } from "./NotificationProvider";

/** FCM push via `@capacitor/push-notifications`, reporting tokens to our backend. */
export class NativeNotifications implements NotificationProvider {
  private listenersAttached = false;
  private tapHandlers = new Set<(data: Record<string, string>) => void>();

  async requestPermission(): Promise<boolean> {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const permission = await PushNotifications.checkPermissions();
    if (permission.receive === "granted") return true;

    const requested = await PushNotifications.requestPermissions();
    return requested.receive === "granted";
  }

  async register(onToken?: (token: string) => void): Promise<void> {
    await this.attachListeners(onToken);

    const granted = await this.requestPermission();
    if (!granted) return;

    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.register();
  }

  onNotificationTap(handler: (data: Record<string, string>) => void): () => void {
    this.tapHandlers.add(handler);
    return () => this.tapHandlers.delete(handler);
  }

  private async attachListeners(onToken?: (token: string) => void): Promise<void> {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    const { PushNotifications } = await import("@capacitor/push-notifications");

    await PushNotifications.addListener("registration", async (token) => {
      onToken?.(token.value);
      try {
        await fetch("/api/push/register-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.value }),
        });
      } catch (error) {
        console.error("[push] Failed to register device token:", error);
      }
    });

    await PushNotifications.addListener("registrationError", (error) => {
      console.error("[push] Registration error:", error);
    });

    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const data = (action.notification.data as Record<string, string>) ?? {};
      this.tapHandlers.forEach((handler) => handler(data));
    });
  }
}
