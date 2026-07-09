import fetch from "node-fetch";

const NEXT_ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000";
const NEXT_SHARED_SECRET = process.env.NEXT_SHARED_SECRET || "change_me_now";
const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 5000);

export type NMSessionResult = {
  ok: boolean;
  nmScore: number;
  nmTier: string;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  newAchievements: { key: string; name: string; description: string }[];
  countedToday: boolean;
  milestoneStreak: number | null;
};

// Registers a daily session / advances the login streak for a user and
// returns the recomputed NM Score state. Never throws — matchmaking must
// keep working even if the scoring service is unavailable.
export async function registerNMSession(userId: string): Promise<NMSessionResult | null> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
    const res = await fetch(`${NEXT_ORIGIN}/api/nm-score/session`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-shared-secret": NEXT_SHARED_SECRET,
      },
      body: JSON.stringify({ userId }),
      signal: controller.signal,
    });
    clearTimeout(t);

    if (!res.ok) {
      console.warn("[nmScore] session registration failed", res.status);
      return null;
    }
    return (await res.json()) as NMSessionResult;
  } catch (err: any) {
    console.warn("[nmScore] session registration error", err?.message ?? err);
    return null;
  }
}
