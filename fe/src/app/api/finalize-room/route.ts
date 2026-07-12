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
  endedAtDate: Date | null,
) {
  // Solo/empty rooms aren't real conversations — nothing to score.
  if (participants.length < 2) return;

  const end = endedAtDate ?? new Date();

  for (const p of participants) {
    try {
      const joined = parseJoinedAt(p.joinedAt, startedAtDate ?? end);
      const durationMs = end.getTime() - joined.getTime();
      const completed = durationMs >= MIN_COMPLETION_MS;

      await prisma.user.update({
        where: { id: p.userId },
        data: completed
          ? {
              conversationsStarted: { increment: 1 },
              conversationsCompleted: { increment: 1 },
            }
          : {
              conversationsStarted: { increment: 1 },
              skipCount: { increment: 1 },
            },
      });

      // Clamped at 0 via raw SQL — a plain `increment` would let repeated
      // skip penalties push xp negative (no floor exists on the column).
      const xpDelta = completed
        ? XP_AWARDS.CONVERSATION_COMPLETED
        : XP_AWARDS.REPEATED_SKIP;
      await prisma.$executeRaw`UPDATE "User" SET xp = GREATEST(xp + ${xpDelta}, 0) WHERE id = ${p.userId}`;

      await recomputeAndPersistScore(prisma, p.userId);
    } catch (err) {
      // Never let scoring failures block room finalization.
      console.error("nm-score conversation outcome error", p.userId, err);
    }
  }
}

// Records one CallHistory row per participant so a user's recent-calls list
// can be rendered later. Only meaningful for real 1:1 calls (2 participants).
async function recordCallHistory(
  participants: ParticipantPayload[],
  roomId: string,
  startedAtDate: Date | null,
  endedAtDate: Date | null,
) {
  if (participants.length < 2) return;

  const end = endedAtDate ?? new Date();

  for (const p of participants) {
    const peer =
      participants.find((other) => other.userId !== p.userId) ?? null;

    try {
      const existing = await prisma.callHistory.findFirst({
        where: { userId: p.userId, roomId },
        select: { id: true },
      });
      if (existing) continue;

      let peerUsername: string | undefined;
      if (peer) {
        const peerUser = await prisma.user.findUnique({
          where: { id: peer.userId },
          select: { username: true, name: true },
        });
        peerUsername = peerUser?.username ?? peerUser?.name ?? undefined;
      }

      const joined = parseJoinedAt(p.joinedAt, startedAtDate ?? end);
      const durationSec = Math.max(
        0,
        Math.round((end.getTime() - joined.getTime()) / 1000),
      );

      await prisma.callHistory.create({
        data: {
          userId: p.userId,
          roomId,
          peerId: peer?.userId,
          peerUsername,
          startedAt: startedAtDate ?? joined,
          endedAt: endedAtDate ?? end,
          durationSec,
        },
      });
    } catch (err) {
      console.error("call-history record error", p.userId, err);
    }
  }
}

// strict date parsing
function parseDateStrict(
  input: string | number | null | undefined,
  fieldName = "date",
): Date {
  if (input == null || input === "")
    throw new Error(`${fieldName} is required`);
  if (typeof input === "number" || /^\d+$/.test(String(input))) {
    const n = Number(input);
    const d = new Date(n);
    if (isNaN(d.getTime()))
      throw new Error(`${fieldName} is not a valid timestamp`);
    return d;
  }
  if (typeof input === "string") {
    const d = new Date(input);
    if (isNaN(d.getTime()))
      throw new Error(`${fieldName} is not a valid ISO date string`);
    return d;
  }
  throw new Error(`${fieldName} has unsupported type`);
}

type ParticipantPayload = {
  userId: string;
  joinedAt?: string | number;
};

// participant.joinedAt arrives as the same epoch-ms string shape as
// startedAt/endedAt, so it needs the same numeric-aware parsing.
function parseJoinedAt(
  input: string | number | undefined,
  fallback: Date,
): Date {
  if (input == null || input === "") return fallback;
  try {
    return parseDateStrict(input, "joinedAt");
  } catch {
    return fallback;
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-shared-secret");
  if (!secret || secret !== SHARED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      roomId,
      participants,
      startedAt,
      endedAt,
      state /* partsMeta (ignored) */,
    } = body;

    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json(
        { error: "roomId is required and must be a string" },
        { status: 400 },
      );
    }
    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "participants must be a non-empty array" },
        { status: 400 },
      );
    }

    // Validate participants: only userId and (optional) joinedAt
    const validatedParticipants: ParticipantPayload[] = participants.map(
      (p: Record<string, unknown>, idx: number) => {
        if (!p || typeof p !== "object")
          throw new Error(`participant[${idx}] must be an object`);
        if (!("userId" in p) || typeof p.userId !== "string")
          throw new Error(
            `participant[${idx}].userId is required and must be a string`,
          );
        return {
          userId: p.userId as string,
          // prefer explicit joinedAt from payload; else fall back to startedAt
          joinedAt: "joinedAt" in p ? p.joinedAt : (startedAt ?? undefined),
        };
      },
    );

    // Parse dates
    let startedAtDate: Date | null = null;
    let endedAtDate: Date | null = null;
    try {
      if (startedAt != null)
        startedAtDate = parseDateStrict(startedAt, "startedAt");
      if (endedAt != null) endedAtDate = parseDateStrict(endedAt, "endedAt");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // finalize-room is always the terminal event for a room; the Redis-side
    // "state" field (e.g. "active" from match_and_claim.lua) is lowercase and
    // never actually reaches "ended", so it isn't a valid ChatRoomStatus.
    const VALID_STATES = ["WAITING", "ACTIVE", "ENDED"] as const;
    const upperState = typeof state === "string" ? state.toUpperCase() : "";
    const finalState = (VALID_STATES as readonly string[]).includes(upperState)
      ? (upperState as (typeof VALID_STATES)[number])
      : "ENDED";

    // Fast-path create; on unique conflict fall back to update path
    try {
      const createData: Prisma.ChatRoomCreateInput = {
        id: roomId,
        status: finalState,
        createdAt: startedAtDate ?? new Date(),
        endedAt: endedAtDate ?? new Date(),
        participants: {
          create: validatedParticipants.map((p) => ({
            userId: p.userId,
            joinedAt: parseJoinedAt(p.joinedAt, startedAtDate ?? new Date()),
            leftAt: endedAtDate ?? undefined,
          })),
        },
      };

      await prisma.chatRoom.create({ data: createData });

      await awardConversationOutcome(
        validatedParticipants,
        startedAtDate,
        endedAtDate,
      );
      await recordCallHistory(
        validatedParticipants,
        roomId,
        startedAtDate,
        endedAtDate,
      );

      return NextResponse.json(
        { ok: true, created: true, roomId },
        { status: 201 },
      );
    } catch (createErr: unknown) {
      if (
        createErr instanceof Prisma.PrismaClientKnownRequestError &&
        createErr.code === "P2002"
      ) {
        // Room exists → update and ensure participants exist
        try {
          await prisma.chatRoom.update({
            where: { id: roomId },
            data: {
              status: finalState,
              endedAt: endedAtDate ?? new Date(),
            },
          });

          for (const p of validatedParticipants) {
            const existing = await prisma.participant.findFirst({
              where: { userId: p.userId, roomId },
              select: { id: true },
            });

            if (!existing) {
              await prisma.participant.create({
                data: {
                  userId: p.userId,
                  roomId,
                  joinedAt: parseJoinedAt(
                    p.joinedAt,
                    startedAtDate ?? new Date(),
                  ),
                  leftAt: endedAtDate ?? undefined,
                },
              });
            } else {
              await prisma.participant.update({
                where: { id: existing.id },
                data: {
                  leftAt: endedAtDate ?? undefined,
                },
              });
            }
          }

          await awardConversationOutcome(
            validatedParticipants,
            startedAtDate,
            endedAtDate,
          );
          await recordCallHistory(
            validatedParticipants,
            roomId,
            startedAtDate,
            endedAtDate,
          );

          return NextResponse.json(
            { ok: true, updated: true, roomId },
            { status: 200 },
          );
        } catch (updateErr) {
          console.error("finalize-room update transaction failed", updateErr);
          return NextResponse.json(
            {
              error: "failed to update room or participants",
              detail: String(updateErr),
            },
            { status: 500 },
          );
        }
      }

      console.error("finalize-room create failed", createErr);
      return NextResponse.json(
        { error: "failed to create room", detail: String(createErr) },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("finalize-room unexpected error", err);
    return NextResponse.json(
      { error: "internal_server_error", detail: String(err) },
      { status: 500 },
    );
  }
}
