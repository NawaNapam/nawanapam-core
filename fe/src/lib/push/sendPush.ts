import { prisma } from "@/lib/prisma";
import { messaging } from "./firebaseAdmin";

export type PushPayload = {
  title: string;
  body: string;
  /** Small string map only — FCM data payloads must be string-to-string. */
  data?: Record<string, string>;
};

/**
 * Sends a push to every device registered for a user and prunes tokens FCM
 * reports as dead. No-ops (returns 0) when Firebase isn't configured yet, or
 * the user has no registered devices — callers never need to branch on that.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<number> {
  if (!messaging) return 0;

  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });
  if (tokens.length === 0) return 0;

  const response = await messaging.sendEachForMulticast({
    tokens: tokens.map((t) => t.token),
    notification: { title: payload.title, body: payload.body },
    data: payload.data,
    android: { priority: "high" },
  });

  const deadTokens = response.responses
    .map((r, i) => (!r.success ? tokens[i].token : null))
    .filter((t): t is string => t !== null);

  if (deadTokens.length > 0) {
    await prisma.pushToken.deleteMany({ where: { token: { in: deadTokens } } });
  }

  return response.successCount;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<void> {
  await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
}
