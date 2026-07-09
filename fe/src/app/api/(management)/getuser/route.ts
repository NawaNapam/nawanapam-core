import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(_request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", session: session || null },
      { status: 401 }
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      image: true,
      isAnonymous: true,
      banned: true,
      createdAt: true,
      updatedAt: true,
      nmTier: true,
      currentStreak: true,
      longestStreak: true,
      xp: true,
      streakFreezes: true,
      achievements: {
        select: { achievementKey: true, unlockedAt: true },
        orderBy: { unlockedAt: "desc" },
      },
      // nmScore intentionally excluded — the raw score is never exposed to clients.
    },
  });
  return NextResponse.json(user);
}
