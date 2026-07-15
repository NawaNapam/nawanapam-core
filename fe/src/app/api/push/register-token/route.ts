// app/api/push/register-token/route.ts
// Called by the Capacitor Android app once it has an FCM device token, so the
// backend can target this user for match/message/reminder pushes.
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const token = body?.token;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  // A token belongs to one device; if it was previously registered to a
  // different account (e.g. logged out and back in as someone else on the
  // same phone), re-point it at the current user instead of erroring.
  await prisma.pushToken.upsert({
    where: { token },
    create: { token, userId: session.user.id, platform: "android" },
    update: { userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const token = body?.token;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  await prisma.pushToken.deleteMany({
    where: { token, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
