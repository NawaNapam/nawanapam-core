// app/api/nm-score/login-session/route.ts
// Registers today's active session for the signed-in user, the same way
// socket auth does for the video-chat flow, so the streak/XP tick fires
// as soon as the user is on the site (e.g. viewing the dashboard) rather
// than only once they enter a call.
import { authOptions } from "@/lib/authOptions";
import { prisma, registerDailySession } from "@/lib/nmScoreService";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await registerDailySession(prisma, session.user.id);
  if (!result) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    nmTier: result.nmTier,
    xp: result.xp,
    currentStreak: result.currentStreak,
    longestStreak: result.longestStreak,
    newAchievements: result.newAchievements,
    countedToday: result.countedToday,
    milestoneStreak: result.milestoneStreak,
  });
}
