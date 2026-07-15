export interface NotificationProvider {
  /** Resolves `true` once the user has granted permission. */
  requestPermission(): Promise<boolean>;
  /** Registers this device to receive notifications; reports the token to the backend when one exists. */
  register(onToken?: (token: string) => void): Promise<void>;
  /** Subscribes to notification-tap events; returns an unsubscribe function. */
  onNotificationTap(handler: (data: Record<string, string>) => void): () => void;
}
