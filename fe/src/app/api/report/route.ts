import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const createReportSchema = z.object({
  reportedUserId: z.string().min(1),
  roomId: z.string().min(1).optional(),
  reason: z.string().min(1).max(100),
  message: z.string().min(1).max(1000),
});

// Lets either party in a call flag something unusual about the other side.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reportedUserId, roomId, reason, message } = createReportSchema.parse(body);

    if (reportedUserId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot report yourself" },
        { status: 400 },
      );
    }

    // roomId may reference a ChatRoom that isn't persisted yet (it's only
    // written on finalize-room, at the end of the call), so fall back to an
    // un-scoped report rather than failing the whole submission on the FK.
    const createReport = (withRoomId: boolean) =>
      prisma.report.create({
        data: {
          reporterId: session.user.id,
          reportedUserId,
          roomId: withRoomId ? roomId : undefined,
          reason,
          message,
        },
      });

    let report;
    try {
      report = await createReport(Boolean(roomId));
    } catch (err) {
      if (
        roomId &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        report = await createReport(false);
      } else {
        throw err;
      }
    }

    return NextResponse.json({ success: true, reportId: report.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Create report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
