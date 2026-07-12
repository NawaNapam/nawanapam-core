import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const SHARED_SECRET = process.env.NEXT_SHARED_SECRET || "change_me_now";

const DEFAULT_REASON = "Reported with proof";
const DEFAULT_MESSAGE = "Submitted via the report form. See attached proof.";

const webhookSchema = z.object({
  reporterEmail: z.string().email(),
  roomId: z.string().min(1),
  reason: z.string().min(1).max(100).default(DEFAULT_REASON),
  message: z.string().min(1).max(1000).default(DEFAULT_MESSAGE),
  responseLink: z.string().url(),
});

// Called by the Google Apps Script trigger attached to the "report with
// proof" form once a user submits it. The form only carries a Call ID and
// the reporter's email, so the reported user is resolved from that call's
// CallHistory row rather than trusted from free-text form input.
export async function POST(request: NextRequest) {
  try {
    const secret = request.headers.get("x-shared-secret");
    if (!secret || secret !== SHARED_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { reporterEmail, roomId, reason, message, responseLink } =
      webhookSchema.parse(body);

    const reporter = await prisma.user.findUnique({
      where: { email: reporterEmail },
      select: { id: true },
    });
    if (!reporter) {
      return NextResponse.json({ error: "Reporter not found" }, { status: 404 });
    }

    const call = await prisma.callHistory.findFirst({
      where: { roomId, userId: reporter.id },
      orderBy: { createdAt: "desc" },
      select: { peerId: true },
    });
    if (!call?.peerId) {
      return NextResponse.json(
        { error: "Could not identify the reported user for this call" },
        { status: 400 },
      );
    }

    // roomId may reference a ChatRoom that isn't persisted yet (it's only
    // written on finalize-room, at the end of the call), so fall back to an
    // un-scoped report rather than failing the whole submission on the FK.
    const createReport = (withRoomId: boolean) =>
      prisma.report.create({
        data: {
          reporterId: reporter.id,
          reportedUserId: call.peerId!,
          roomId: withRoomId ? roomId : undefined,
          reason,
          message,
          responseLink,
        },
      });

    let report;
    try {
      report = await createReport(true);
    } catch (err) {
      if (
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

    console.error("Report webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
