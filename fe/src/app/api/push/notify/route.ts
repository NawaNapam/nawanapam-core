// app/api/push/notify/route.ts
// Internal endpoint called by the `be` realtime server (never the browser/app
// directly) to push a notification when something happens server-side that
// the recipient's socket can't reach them for — e.g. they backgrounded the
// app while waiting for a match, or a chat message arrived while away.
import { NextRequest, NextResponse } from "next/server";
import { requireSharedSecret } from "@/lib/nmScoreService";
import { sendPushToUsers } from "@/lib/push/sendPush";

export async function POST(req: NextRequest) {
  if (!requireSharedSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const userIds: unknown = body?.userIds ?? (body?.userId ? [body.userId] : undefined);
  const title = body?.title;
  const text = body?.body;

  if (!Array.isArray(userIds) || userIds.length === 0 || !userIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "userIds (string[]) is required" }, { status: 400 });
  }
  if (!title || !text) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  const data: Record<string, string> =
    body?.data && typeof body.data === "object" ? body.data : {};

  await sendPushToUsers(userIds, { title, body: text, data });

  return NextResponse.json({ ok: true });
}
