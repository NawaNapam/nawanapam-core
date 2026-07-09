import type { NMTier } from "@prisma/client";

/**
 * NM Score: a 0-100 soft priority signal used by the matchmaking engine
 * (see be/redis/scripts/match_and_claim.lua) to weight — not gate — candidate
 * selection. Formula is intentionally not exposed to clients.
 */

export type NMScoreInputs = {
  currentStreak: number;
  totalSessions: number;
  conversationsStarted: number;
  conversationsCompleted: number;
  skipCount: number;
  reportsAgainstCount: number; // ACTION_TAKEN reports only
  xp: number;
  profileCompleted: boolean;
  emailVerified: boolean;
};

const STREAK_CAP_DAYS = 30;
const SESSIONS_CAP = 100;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function streakComponent(days: number): number {
  // +2/day up to the cap, i.e. day 30 = 50, matches the spec's example curve.
  const capped = clamp(days, 0, STREAK_CAP_DAYS);
  return Math.round((capped / STREAK_CAP_DAYS) * 50);
}

function sessionComponent(totalSessions: number): number {
  if (totalSessions <= 0) return 0;
  if (totalSessions <= 20) return 5;
  if (totalSessions <= 50) return 10;
  if (totalSessions <= 100) return 15;
  return 20;
}

function completionComponent(started: number, completed: number): number {
  if (started <= 0) return 0;
  const ratio = clamp(completed / started, 0, 1);
  return Math.round(ratio * 20);
}

function xpComponent(xp: number): number {
  return clamp(Math.round(xp / 20), 0, 30);
}

function positiveComponent(profileCompleted: boolean, emailVerified: boolean): number {
  let v = 0;
  if (profileCompleted) v += 5;
  if (emailVerified) v += 5;
  return v;
}

function penaltyComponent(skipCount: number, reportsAgainstCount: number): number {
  const skipPenalty = clamp(skipCount * 1, 0, 20);
  const reportPenalty = clamp(reportsAgainstCount * 15, 0, 60);
  return skipPenalty + reportPenalty;
}

export function computeNMScore(inputs: NMScoreInputs): number {
  const raw =
    streakComponent(inputs.currentStreak) +
    sessionComponent(inputs.totalSessions) +
    completionComponent(inputs.conversationsStarted, inputs.conversationsCompleted) +
    xpComponent(inputs.xp) +
    positiveComponent(inputs.profileCompleted, inputs.emailVerified) -
    penaltyComponent(inputs.skipCount, inputs.reportsAgainstCount);

  return clamp(Math.round(raw), 0, 100);
}

const TIER_THRESHOLDS: Array<{ tier: NMTier; min: number }> = [
  { tier: "LEGEND", min: 90 },
  { tier: "ELITE", min: 75 },
  { tier: "DEDICATED", min: 60 },
  { tier: "ACTIVE", min: 40 },
  { tier: "REGULAR", min: 20 },
  { tier: "EXPLORER", min: 0 },
];

export function tierForScore(score: number): NMTier {
  for (const { tier, min } of TIER_THRESHOLDS) {
    if (score >= min) return tier;
  }
  return "EXPLORER";
}

export const SESSIONS_CAP_HINT = SESSIONS_CAP;

// --- Streak handling -------------------------------------------------

function utcDateOnly(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export type StreakResult = {
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  freezeConsumed: boolean;
  isNewDay: boolean; // whether this call should count as a new session for the day
};

/**
 * Advances streak state for "now" given the last counted active date.
 * Idempotent within a calendar day (UTC): calling twice on the same day
 * only counts once. A single missed day is forgiven if a streak freeze
 * is available; more than one missed day resets the streak.
 */
export function advanceStreak(
  now: Date,
  lastActiveDate: Date | null,
  currentStreak: number,
  longestStreak: number,
  streakFreezes: number
): StreakResult {
  const today = utcDateOnly(now);

  if (!lastActiveDate) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(longestStreak, 1),
      streakFreezes,
      freezeConsumed: false,
      isNewDay: true,
    };
  }

  const last = utcDateOnly(lastActiveDate);
  const dayGap = Math.round((today - last) / 86_400_000);

  if (dayGap <= 0) {
    // Already counted today.
    return {
      currentStreak,
      longestStreak,
      streakFreezes,
      freezeConsumed: false,
      isNewDay: false,
    };
  }

  if (dayGap === 1) {
    const next = currentStreak + 1;
    return {
      currentStreak: next,
      longestStreak: Math.max(longestStreak, next),
      streakFreezes,
      freezeConsumed: false,
      isNewDay: true,
    };
  }

  if (dayGap === 2 && streakFreezes > 0) {
    // One missed day, spend a freeze to preserve the streak.
    const next = currentStreak + 1;
    return {
      currentStreak: next,
      longestStreak: Math.max(longestStreak, next),
      streakFreezes: streakFreezes - 1,
      freezeConsumed: true,
      isNewDay: true,
    };
  }

  // Gap too large (or no freeze available): reset.
  return {
    currentStreak: 1,
    longestStreak,
    streakFreezes,
    freezeConsumed: false,
    isNewDay: true,
  };
}

// Earn one streak freeze every 7-day streak milestone, capped so they can't hoard.
export function maybeAwardStreakFreeze(newStreak: number, streakFreezes: number): number {
  if (newStreak > 0 && newStreak % 7 === 0) {
    return clamp(streakFreezes + 1, 0, 3);
  }
  return streakFreezes;
}

// Streak lengths (days) that trigger a shareable milestone badge/popup.
export const STREAK_SHARE_MILESTONES = [10, 50, 100] as const;

// Returns the milestone just crossed by advancing from oldStreak to
// newStreak, or null if none was crossed on this tick. A single call only
// ever counts one day of streak growth, so this only needs to check for
// equality rather than a range.
export function streakMilestoneCrossed(oldStreak: number, newStreak: number): number | null {
  if (newStreak === oldStreak) return null;
  return STREAK_SHARE_MILESTONES.find((m) => m === newStreak) ?? null;
}

// --- Progression tiers shown to users (never the raw score) ----------

export const TIER_LABELS: Record<NMTier, string> = {
  EXPLORER: "Explorer",
  REGULAR: "Regular",
  ACTIVE: "Active",
  DEDICATED: "Dedicated",
  ELITE: "Elite",
  LEGEND: "Legend",
};

// --- Achievements ------------------------------------------------------

export type AchievementKey =
  | "FIRST_MATCH"
  | "CONVERSATION_STARTER"
  | "HUNDRED_CONVERSATIONS"
  | "THIRTY_DAY_STREAK"
  | "VERIFIED_MEMBER";

export const ACHIEVEMENT_CATALOG: Record<AchievementKey, { name: string; description: string }> = {
  FIRST_MATCH: { name: "First Match", description: "Completed your first conversation." },
  CONVERSATION_STARTER: { name: "Conversation Starter", description: "Completed 10 conversations." },
  HUNDRED_CONVERSATIONS: { name: "100 Conversations", description: "Completed 100 conversations." },
  THIRTY_DAY_STREAK: { name: "30-Day Streak", description: "Kept a 30-day daily streak." },
  VERIFIED_MEMBER: { name: "Verified Member", description: "Verified your email address." },
};

export type AchievementCheckState = {
  conversationsCompleted: number;
  currentStreak: number;
  emailVerified: boolean;
};

export function unlockedAchievements(state: AchievementCheckState): AchievementKey[] {
  const unlocked: AchievementKey[] = [];
  if (state.conversationsCompleted >= 1) unlocked.push("FIRST_MATCH");
  if (state.conversationsCompleted >= 10) unlocked.push("CONVERSATION_STARTER");
  if (state.conversationsCompleted >= 100) unlocked.push("HUNDRED_CONVERSATIONS");
  if (state.currentStreak >= 30) unlocked.push("THIRTY_DAY_STREAK");
  if (state.emailVerified) unlocked.push("VERIFIED_MEMBER");
  return unlocked;
}

// --- XP awards -----------------------------------------------------------

export const XP_AWARDS = {
  DAILY_LOGIN: 5,
  CONVERSATION_COMPLETED: 20,
  PROFILE_COMPLETED: 30,
  EMAIL_VERIFIED: 50,
  REPORTED_ACTION_TAKEN: -100,
  REPEATED_SKIP: -20,
} as const;
