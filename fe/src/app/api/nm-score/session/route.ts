// app/api/nm-score/session/route.ts
// Called by the `be` realtime server on socket auth to register a daily
// session, advance the login streak, and return the cached NM Score/tier
// state so it can be pushed into Redis for the matchmaking hot path.
import { NextRequest, NextResponse } from "next/server";
import { prisma, requireSharedSecret, registerDailySession } from "@/lib/nmScoreService";

export async function POST(req: NextRequest) {
  if (!requireSharedSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const userId = body?.userId;
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const result = await registerDailySession(prisma, userId);
    if (!result) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      nmScore: result.nmScore,
      nmTier: result.nmTier,
      xp: result.xp,
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
      newAchievements: result.newAchievements,
      countedToday: result.countedToday,
      milestoneStreak: result.milestoneStreak,
    });
  } catch (err) {
    console.error("nm-score session error", err);
    return NextResponse.json(
      { error: "internal_server_error", detail: String(err) },
      { status: 500 }
    );
  }
}
