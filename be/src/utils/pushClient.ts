import fetch from "node-fetch";

const NEXT_ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000";
const NEXT_SHARED_SECRET = process.env.NEXT_SHARED_SECRET || "change_me_now";
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 5000);

/**
 * Fires a push notification via the `fe` app (which owns the Firebase Admin
 * credentials and the PushToken table). Best-effort only: matchmaking/chat
 * must keep working even if push delivery is unconfigured or unreachable.
 */
export async function sendPushNotification(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (userIds.length === 0) return;

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
    const res = await fetch(`${NEXT_ORIGIN}/api/push/notify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-shared-secret": NEXT_SHARED_SECRET,
      },
      body: JSON.stringify({ userIds, title, body, data }),
      signal: controller.signal,
    });
    clearTimeout(t);

    if (!res.ok) {
      console.warn("[push] notify request failed", res.status);
    }
  } catch (err) {
    console.warn("[push] notify request error", err);
  }
}
