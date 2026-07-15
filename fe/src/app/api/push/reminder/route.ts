// app/api/push/reminder/route.ts
// Meant to be hit by an external scheduler (Vercel Cron, cron-job.org, etc.),
// not by the app or `be`. Nudges users who have the app installed (have a
// push token) but haven't been active recently, similar to Flipkart/Zomato's
// "come back" notifications. Safe to call repeatedly — it only ever targets
// users who look inactive at call time, no state of its own to get stuck.
import { NextRequest, NextResponse } from "next/server";
import { Gender } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push/sendPush";

// FOMO / casual nudges — the low-key "come back" copy.
const CASUAL_MESSAGES = [
  { title: "Someone's waiting to talk 👋", body: "Jump back into NawaNapam and meet someone new right now." },
  { title: "It's quiet without you", body: "A few people are online now — start a random video chat." },
  { title: "Keep your streak alive 🔥", body: "You haven't checked in today. One quick chat keeps it going." },
  { title: "You left mid-conversation 💭", body: "The chat's still open. Come see who's around." },
];

// Flirty / playful — teasing tone, no explicit content (keep it Play Store safe).
const FLIRTY_MESSAGES = [
  { title: "Someone might be your type 😏", body: "New faces just came online. One tap and you could be talking to them." },
  { title: "Feeling a little bold tonight? 😉", body: "Random chats hit different after dark. See who's online." },
  { title: "You're being missed 💭", body: "Come say hi — someone new is just a tap away." },
  { title: "Late night chats hit different 🌙", body: "The best conversations happen when you least expect them. Jump in." },
  { title: "Curious who's out there? 👀", body: "Only one way to find out — start a chat." },
];

// Informative — feature nudges / activity signals, factual tone.
const INFO_MESSAGES = [
  { title: "New people just joined NawaNapam", body: "Fresh faces are online right now — be the first to say hi." },
  { title: "Did you know?", body: "You can skip to the next chat anytime with one tap. Try it now." },
  { title: "Peak hours are here", body: "More people are active right now than usual — good time to jump in." },
];

const MESSAGES = [...CASUAL_MESSAGES, ...FLIRTY_MESSAGES, ...INFO_MESSAGES];

// Time-of-day copy — only relevant during its own window, so it's added to
// the pool per-request based on the current hour rather than living in the
// always-eligible MESSAGES array above.
const MORNING_MESSAGES = [
  { title: "Good morning ☀️", body: "Start your day with a fresh conversation on NawaNapam." },
];
const EVENING_MESSAGES = [
  { title: "Evening chat, anyone? 🌆", body: "Wind down after work with a quick random chat." },
];
const NIGHT_MESSAGES = [
  { title: "Can't sleep? 🌙", body: "Someone else is probably up too. Say hi." },
];

/** Server-local hour buckets: 5–12 morning, 17–21 evening, 21–5 night, else no time-specific copy. */
function timeOfDayMessages(): typeof MORNING_MESSAGES {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return MORNING_MESSAGES;
  if (hour >= 17 && hour < 21) return EVENING_MESSAGES;
  if (hour >= 21 || hour < 5) return NIGHT_MESSAGES;
  return [];
}

// Gender-targeted flirty nudges — shown to a user, referencing activity from
// the *other* gender. Named by audience (who receives it), not who it's about.
const MALE_AUDIENCE_MESSAGES = [
  { title: "Girls are online right now 👀", body: "A few women just came online on NawaNapam — say hi before they're gone." },
  { title: "She's online now 😉", body: "Women are active right now. One tap could start something interesting." },
];
const FEMALE_AUDIENCE_MESSAGES = [
  { title: "Guys are online right now 👀", body: "A few men just came online on NawaNapam — say hi before they're gone." },
  { title: "He's online now 😉", body: "Men are active right now. One tap could start something interesting." },
];

/** OTHER/null gender gets no gender-targeted copy — falls back to the general pool. */
function genderTargetedMessages(gender: Gender | null): typeof MALE_AUDIENCE_MESSAGES {
  if (gender === "MALE") return MALE_AUDIENCE_MESSAGES;
  if (gender === "FEMALE") return FEMALE_AUDIENCE_MESSAGES;
  return [];
}

function requireReminderSecret(req: NextRequest): boolean {
  const secret =
    req.headers.get("x-shared-secret") ?? req.nextUrl.searchParams.get("secret");
  return Boolean(secret) && secret === (process.env.PUSH_REMINDER_SECRET || "change_me_now");
}

export async function POST(req: NextRequest) {
  if (!requireReminderSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hoursInactive = Number(req.nextUrl.searchParams.get("hoursInactive") ?? 24);
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 500), 2000);
  const cutoff = new Date(Date.now() - hoursInactive * 60 * 60 * 1000);

  const candidates = await prisma.user.findMany({
    where: {
      banned: false,
      pushTokens: { some: {} },
      OR: [{ lastActiveDate: null }, { lastActiveDate: { lt: cutoff } }],
    },
    select: { id: true, gender: true },
    take: limit,
  });

  // Base pool is shared across everyone; the gender-targeted slice differs
  // per user, so the final pick has to happen inside the loop rather than once.
  const basePool = [...MESSAGES, ...timeOfDayMessages()];

  let sent = 0;
  for (const user of candidates) {
    const pool = [...basePool, ...genderTargetedMessages(user.gender)];
    const message = pool[Math.floor(Math.random() * pool.length)];

    const count = await sendPushToUser(user.id, {
      title: message.title,
      body: message.body,
      data: { type: "reminder" },
    });
    if (count > 0) sent++;
  }

  return NextResponse.json({ ok: true, targeted: candidates.length, sent });
}
