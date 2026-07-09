// app/api/finalize-room/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, Prisma } from "@prisma/client";
import { recomputeAndPersistScore } from "@/lib/nmScoreService";
import { XP_AWARDS } from "@/lib/nmScore";

const prisma = new PrismaClient();
const SHARED_SECRET = process.env.NEXT_SHARED_SECRET || "change_me_now";

// Anti-abuse: a conversation must last at least this long to count as
// "completed" rather than a skip. Filters out instant open/close spam.
const MIN_COMPLETION_MS = 20_000;

async function awardConversationOutcome(
  participants: ParticipantPayload[],
  startedAtDate: Date | null,
  endedAtDate: Date | null
) {
  // Solo/empty rooms aren't real conversations — nothing to score.
  if (participants.length < 2) return;

  const end = endedAtDate ?? new Date();

  for (const p of participants) {
    try {
      const joined = p.joinedAt ? new Date(String(p.joinedAt)) : startedAtDate ?? end;
      const durationMs = end.getTime() - joined.getTime();
      const completed = durationMs >= MIN_COMPLETION_MS;

      await prisma.user.update({
        where: { id: p.userId },
        data: completed
          ? {
              conversationsStarted: { increment: 1 },
              conversationsCompleted: { increment: 1 },
              xp: { increment: XP_AWARDS.CONVERSATION_COMPLETED },
            }
          : {
              conversationsStarted: { increment: 1 },
              skipCount: { increment: 1 },
              xp: { increment: XP_AWARDS.REPEATED_SKIP },
            },
      });

      await recomputeAndPersistScore(prisma, p.userId);
    } catch (err) {
      // Never let scoring failures block room finalization.
      console.error("nm-score conversation outcome error", p.userId, err);
    }
  }
}

// strict date parsing
function parseDateStrict(input: string | number | null | undefined, fieldName = "date"): Date {
  if (input == null || input === "") throw new Error(`${fieldName} is required`);
  if (typeof input === "number" || /^\d+$/.test(String(input))) {
    const n = Number(input);
    const d = new Date(n);
    if (isNaN(d.getTime())) throw new Error(`${fieldName} is not a valid timestamp`);
    return d;
  }
  if (typeof input === "string") {
    const d = new Date(input);
    if (isNaN(d.getTime())) throw new Error(`${fieldName} is not a valid ISO date string`);
    return d;
  }
  throw new Error(`${fieldName} has unsupported type`);
}

type ParticipantPayload = {
  userId: string;
  joinedAt?: string | number;
};

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-shared-secret");
  if (!secret || secret !== SHARED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { roomId, participants, startedAt, endedAt, state /* partsMeta (ignored) */ } = body;

    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json(
        { error: "roomId is required and must be a string" },
        { status: 400 }
      );
    }
    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "participants must be a non-empty array" },
        { status: 400 }
      );
    }

    // Validate participants: only userId and (optional) joinedAt
    const validatedParticipants: ParticipantPayload[] = participants.map(
      (p: Record<string, unknown>, idx: number) => {
        if (!p || typeof p !== "object") throw new Error(`participant[${idx}] must be an object`);
        if (!("userId" in p) || typeof p.userId !== "string")
          throw new Error(`participant[${idx}].userId is required and must be a string`);
        return {
          userId: p.userId as string,
          // prefer explicit joinedAt from payload; else fall back to startedAt
          joinedAt: "joinedAt" in p ? p.joinedAt : startedAt ?? undefined,
        };
      }
    );

    // Parse dates
    let startedAtDate: Date | null = null;
    let endedAtDate: Date | null = null;
    try {
      if (startedAt != null) startedAtDate = parseDateStrict(startedAt, "startedAt");
      if (endedAt != null) endedAtDate = parseDateStrict(endedAt, "endedAt");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const finalState = typeof state === "string" ? state : "ENDED";

    // Fast-path create; on unique conflict fall back to update path
    try {
      const createData: Prisma.ChatRoomCreateInput = {
        id: roomId,
        status: finalState as "WAITING" | "ACTIVE" | "ENDED",
        createdAt: startedAtDate ?? new Date(),
        endedAt: endedAtDate ?? new Date(),
        participants: {
          create: validatedParticipants.map((p) => ({
            userId: p.userId,
            joinedAt: p.joinedAt ? new Date(String(p.joinedAt)) : startedAtDate ?? new Date(),
            leftAt: endedAtDate ?? undefined,
          })),
        },
      };

      await prisma.$transaction(async (tx) => {
        await tx.chatRoom.create({ data: createData });
      });

      await awardConversationOutcome(validatedParticipants, startedAtDate, endedAtDate);

      return NextResponse.json({ ok: true, created: true, roomId }, { status: 201 });
    } catch (createErr: unknown) {
      if (createErr instanceof Prisma.PrismaClientKnownRequestError && createErr.code === "P2002") {
        // Room exists → update and ensure participants exist
        try {
          await prisma.$transaction(async (tx) => {
            await tx.chatRoom.update({
              where: { id: roomId },
              data: {
                status: finalState as "WAITING" | "ACTIVE" | "ENDED",
                endedAt: endedAtDate ?? new Date(),
              },
            });

            for (const p of validatedParticipants) {
              const existing = await tx.participant.findFirst({
                where: { userId: p.userId, roomId },
                select: { id: true },
              });

              if (!existing) {
                await tx.participant.create({
                  data: {
                    userId: p.userId,
                    roomId,
                    joinedAt: p.joinedAt ? new Date(String(p.joinedAt)) : startedAtDate ?? new Date(),
                    leftAt: endedAtDate ?? undefined,
                  },
                });
              } else {
                await tx.participant.update({
                  where: { id: existing.id },
                  data: {
                    leftAt: endedAtDate ?? undefined,
                  },
                });
              }
            }
          });

          await awardConversationOutcome(validatedParticipants, startedAtDate, endedAtDate);

          return NextResponse.json({ ok: true, updated: true, roomId }, { status: 200 });
        } catch (updateErr) {
          console.error("finalize-room update transaction failed", updateErr);
          return NextResponse.json(
            { error: "failed to update room or participants", detail: String(updateErr) },
            { status: 500 }
          );
        }
      }

      console.error("finalize-room create failed", createErr);
      return NextResponse.json(
        { error: "failed to create room", detail: String(createErr) },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("finalize-room unexpected error", err);
    return NextResponse.json(
      { error: "internal_server_error", detail: String(err) },
      { status: 500 }
    );
  }
}