import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin, hasAdminRole } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

// Get all users with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin || !hasAdminRole(admin, "MODERATOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const banned = searchParams.get("banned");
    const isAnonymous = searchParams.get("isAnonymous");
    const isExport = searchParams.get("export") === "true";

    if (isExport && !hasAdminRole(admin, "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const skip = (page - 1) * limit;

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }

    if (banned === "true") where.banned = true;
    if (banned === "false") where.banned = false;
    if (isAnonymous === "true") where.isAnonymous = true;
    if (isAnonymous === "false") where.isAnonymous = false;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        ...(isExport ? {} : { skip, take: limit }),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          isAnonymous: true,
          banned: true,
          phoneNumber: true,
          gender: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              participants: true,
              reportsMade: true,
              reportsAgainst: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
