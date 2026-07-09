"use client";

import { useEffect, useState } from "react";
import { Flame, Award } from "lucide-react";
import StreakHeatmap from "./StreakHeatmap";
import StreakMilestoneModal from "./StreakMilestoneModal";
import { Skeleton } from "@/components/ui/skeleton";

type NMBadgeData = {
  nmTier: string;
  currentStreak: number;
  xp: number;
};

const TIER_LABELS: Record<string, string> = {
  EXPLORER: "Explorer",
  REGULAR: "Regular",
  ACTIVE: "Active",
  DEDICATED: "Dedicated",
  ELITE: "Elite",
  LEGEND: "Legend",
};

// Shows the user's progression tier and streak — never the raw NM Score,
// which is intentionally kept invisible to avoid encouraging gaming it.
export default function NMBadge() {
  const [data, setData] = useState<NMBadgeData | null>(null);
  const [milestoneStreak, setMilestoneStreak] = useState<number | null>(null);
  // Flips once today's session is registered, so StreakHeatmap doesn't read
  // the DB before that write lands (it would otherwise race and show today
  // as blank).
  const [sessionRegistered, setSessionRegistered] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Register today's session (advances streak/XP) before reading the
    // user's current state, so the badge reflects today's tick immediately.
    fetch("/api/nm-score/login-session", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (session) => {
        if (cancelled) return;
        if (session?.milestoneStreak) {
          setMilestoneStreak(session.milestoneStreak);
        }

        if (session && !session.error) {
          // The session response already carries the fresh tier/streak/xp —
          // use it directly rather than waiting on a second round trip.
          setData({
            nmTier: session.nmTier ?? "EXPLORER",
            currentStreak: session.currentStreak ?? 0,
            xp: session.xp ?? 0,
          });
          return;
        }

        // Fallback if session registration failed for any reason.
        const res = await fetch("/api/getuser");
        const json = res.ok ? await res.json() : null;
        if (!cancelled && json && !json.error) {
          setData({
            nmTier: json.nmTier ?? "EXPLORER",
            currentStreak: json.currentStreak ?? 0,
            xp: json.xp ?? 0,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSessionRegistered(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {data ? (
        <div className="flex items-center gap-3 rounded-md border border-border bg-muted px-3 py-2 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Award size={16} className="text-signature-coral" />
            {TIER_LABELS[data.nmTier] ?? data.nmTier}
          </span>
          <span className="inline-flex items-center gap-1 text-body">
            <Flame size={16} className="text-orange-500" />
            {data.currentStreak} day{data.currentStreak === 1 ? "" : "s"}
          </span>
          <span className="text-body">{data.xp} XP</span>
        </div>
      ) : (
        <Skeleton className="h-9 w-full max-w-xs rounded-md" />
      )}

      <StreakHeatmap ready={sessionRegistered} />

      <StreakMilestoneModal streak={milestoneStreak} onClose={() => setMilestoneStreak(null)} />
    </div>
  );
}
