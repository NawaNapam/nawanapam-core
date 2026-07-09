// app/api/nm-score/badge/route.tsx
// Renders a shareable "milestone" badge image (PNG) for the signed-in user
// so streak popups can offer a one-tap share (Web Share API on mobile) or
// download, without needing any third-party posting API/OAuth approval.
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/nmScoreService";
import { TIER_LABELS } from "@/lib/nmScore";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import type { NMTier } from "@prisma/client";

const TIER_COLORS: Record<NMTier, [string, string]> = {
  EXPLORER: ["#4b5563", "#1f2937"],
  REGULAR: ["#2563eb", "#1e3a8a"],
  ACTIVE: ["#16a34a", "#14532d"],
  DEDICATED: ["#d9a441", "#8a5a12"],
  ELITE: ["#f4d35e", "#aa2d00"],
  LEGEND: ["#fcab79", "#7c2d12"],
};

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, username: true, currentStreak: true, xp: true, nmTier: true },
  });
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const milestoneParam = Number(req.nextUrl.searchParams.get("streak"));
  const streak = Number.isFinite(milestoneParam) && milestoneParam > 0 ? milestoneParam : user.currentStreak;
  const displayName = user.username || user.name || "Nawa Napam Member";
  const [accent, accentDark] = TIER_COLORS[user.nmTier] ?? TIER_COLORS.EXPLORER;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          backgroundColor: "#181d26",
          backgroundImage: `linear-gradient(135deg, ${accentDark} 0%, #181d26 60%)`,
          color: "#f8f5f0",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: -1 }}>
            Nawa Napam
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 24px",
              borderRadius: 999,
              backgroundColor: accent,
              color: "#181d26",
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            {TIER_LABELS[user.nmTier] ?? user.nmTier}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ display: "flex", fontSize: 240, fontWeight: 800, lineHeight: 1, color: accent }}>
            {streak}
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 600, marginTop: 8 }}>
            Day Streak 🔥
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 600 }}>@{displayName}</div>
          <div style={{ display: "flex", fontSize: 28, opacity: 0.85 }}>{user.xp} XP earned</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
