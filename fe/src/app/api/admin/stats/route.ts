import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get statistics
    const [
      totalUsers,
      activeUsers,
      totalRooms,
      activeRooms,
      totalReports,
      pendingReports,
      bannedUsers,
      avgNmScore,
      avgStreak,
      nmTierBreakdown,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { banned: false } }),
      prisma.chatRoom.count(),
      prisma.chatRoom.count({ where: { status: "ACTIVE" } }),
      prisma.report.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.user.count({ where: { banned: true } }),
      prisma.user.aggregate({ _avg: { nmScore: true } }),
      prisma.user.aggregate({ _avg: { currentStreak: true } }),
      prisma.user.groupBy({ by: ["nmTier"], _count: { _all: true } }),
    ]);

    // Get recent reports
    const recentReports = await prisma.report.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { id: true, email: true, username: true } },
        reportedUser: { select: { id: true, email: true, username: true } },
      },
    });

    // Get recent users
    const recentUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        username: true,
        isAnonymous: true,
        banned: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      stats: {
        totalUsers,
        activeUsers,
        totalRooms,
        activeRooms,
        totalReports,
        pendingReports,
        bannedUsers,
        avgNmScore: avgNmScore._avg.nmScore ?? 0,
        avgStreak: avgStreak._avg.currentStreak ?? 0,
        nmTierBreakdown: nmTierBreakdown.map((row) => ({
          tier: row.nmTier,
          count: row._count._all,
        })),
      },
      recentReports,
      recentUsers,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
