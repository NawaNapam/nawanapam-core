import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  ACHIEVEMENT_CATALOG,
  advanceStreak,
  computeNMScore,
  maybeAwardStreakFreeze,
  streakMilestoneCrossed,
  tierForScore,
  unlockedAchievements,
  XP_AWARDS,
  type AchievementKey,
} from "@/lib/nmScore";

type Db = PrismaClient | Prisma.TransactionClient;

export type DailySessionResult = RecomputeResult & {
  countedToday: boolean;
  milestoneStreak: number | null;
};

/**
 * Registers today's active session for a user (advancing their streak and
 * awarding daily-login XP the first time this is called on a given UTC day),
 * then recomputes their NM Score. Idempotent within a day. Shared by the
 * realtime server's socket-auth hook and the dashboard's session-load hook,
 * so a streak/XP tick happens whichever surface the user touches first.
 */
export async function registerDailySession(
  db: Db,
  userId: string
): Promise<DailySessionResult | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      streakFreezes: true,
      lastActiveDate: true,
    },
  });
  if (!user) return null;

  const now = new Date();
  const streak = advanceStreak(
    now,
    user.lastActiveDate,
    user.currentStreak,
    user.longestStreak,
    user.streakFreezes
  );

  if (streak.isNewDay) {
    const awardedFreezes = maybeAwardStreakFreeze(streak.currentStreak, streak.streakFreezes);

    await db.user.update({
      where: { id: userId },
      data: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        streakFreezes: awardedFreezes,
        lastActiveDate: now,
        totalSessions: { increment: 1 },
        xp: { increment: XP_AWARDS.DAILY_LOGIN },
      },
    });
  }

  // Recorded on every call (not just isNewDay) so the heatmap always
  // reflects today even if the streak counter itself was already ticked
  // earlier today by another surface (e.g. a video call, then a dashboard
  // visit) — the streak tick is idempotent per day, but activity tracking
  // shouldn't silently no-op just because the streak already advanced.
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  await db.dailyActivity.upsert({
    where: { userId_date: { userId, date: today } },
    create: { userId, date: today, sessionCount: 1 },
    update: { sessionCount: { increment: 1 } },
  });

  const result = await recomputeAndPersistScore(db, userId);
  if (!result) return null;

  const milestoneStreak = streak.isNewDay
    ? streakMilestoneCrossed(user.currentStreak, streak.currentStreak)
    : null;

  return { ...result, countedToday: streak.isNewDay, milestoneStreak };
}

export type RecomputeResult = {
  nmScore: number;
  nmTier: string;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  newAchievements: { key: AchievementKey; name: string; description: string }[];
};

/**
 * Recomputes and persists a user's NM Score/tier and unlocks any newly
 * earned achievements. Called after any event that changes an input signal
 * (session/streak, conversation completion, report resolution, etc).
 */
export async function recomputeAndPersistScore(
  db: Db,
  userId: string
): Promise<RecomputeResult | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      username: true,
      gender: true,
      emailVerified: true,
      xp: true,
      currentStreak: true,
      longestStreak: true,
      totalSessions: true,
      conversationsStarted: true,
      conversationsCompleted: true,
      skipCount: true,
    },
  });
  if (!user) return null;

  const reportsAgainstCount = await db.report.count({
    where: { reportedUserId: userId, status: "ACTION_TAKEN" },
  });

  const profileCompleted = Boolean(user.name && user.username && user.gender);
  const emailVerified = Boolean(user.emailVerified);

  const score = computeNMScore({
    currentStreak: user.currentStreak,
    totalSessions: user.totalSessions,
    conversationsStarted: user.conversationsStarted,
    conversationsCompleted: user.conversationsCompleted,
    skipCount: user.skipCount,
    reportsAgainstCount,
    xp: user.xp,
    profileCompleted,
    emailVerified,
  });
  const tier = tierForScore(score);

  const earned = unlockedAchievements({
    conversationsCompleted: user.conversationsCompleted,
    currentStreak: user.currentStreak,
    emailVerified,
  });

  const existing = await db.userAchievement.findMany({
    where: { userId, achievementKey: { in: earned } },
    select: { achievementKey: true },
  });
  const existingKeys = new Set(existing.map((e) => e.achievementKey));
  const newKeys = earned.filter((k) => !existingKeys.has(k)) as AchievementKey[];

  if (newKeys.length > 0) {
    await db.userAchievement.createMany({
      data: newKeys.map((achievementKey) => ({ userId, achievementKey })),
      skipDuplicates: true,
    });
  }

  await db.user.update({
    where: { id: userId },
    data: { nmScore: score, nmTier: tier },
  });

  return {
    nmScore: score,
    nmTier: tier,
    xp: user.xp,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    newAchievements: newKeys.map((key) => ({ key, ...ACHIEVEMENT_CATALOG[key] })),
  };
}

export function requireSharedSecret(req: Request): boolean {
  const secret = req.headers.get("x-shared-secret");
  return Boolean(secret) && secret === (process.env.NEXT_SHARED_SECRET || "change_me_now");
}

export { prisma };
