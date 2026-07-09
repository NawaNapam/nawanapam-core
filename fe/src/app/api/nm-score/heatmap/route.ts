// app/api/nm-score/heatmap/route.ts
// Returns the signed-in user's daily activity for the last ~53 weeks, for
// rendering a GitHub/LeetCode-style contribution heatmap.
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/nmScoreService";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const WEEKS = 53;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - WEEKS * 7);

  const rows = await prisma.dailyActivity.findMany({
    where: { userId: session.user.id, date: { gte: since } },
    select: { date: true, sessionCount: true },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({
    days: rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      count: r.sessionCount,
    })),
  });
}
