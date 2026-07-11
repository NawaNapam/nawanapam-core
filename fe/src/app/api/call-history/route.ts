import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

const HISTORY_LIMIT = 15;

// Returns the signed-in user's most recent calls, newest first. All rows are
// kept in the DB for moderation; this endpoint just caps what's served.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const calls = await prisma.callHistory.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: {
      id: true,
      roomId: true,
      peerId: true,
      peerUsername: true,
      startedAt: true,
      endedAt: true,
      durationSec: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ calls });
}
