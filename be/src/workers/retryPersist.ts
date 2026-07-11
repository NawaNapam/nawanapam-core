import "dotenv/config";
import fetch, { RequestInit } from "node-fetch";
import { redis } from "../utils/redis/redisClient";

const STREAM_KEY = process.env.STREAM_KEY || "stream:ended_rooms";
const GROUP = process.env.STREAM_GROUP || "ended_rooms_group";
const CONSUMER = process.env.STREAM_CONSUMER || (`worker-${Math.floor(Math.random() * 10000)}`);

const NEXT_FINALIZE_ENDPOINT =
  (process.env.NEXT_PUBLIC_ORIGIN || "http://localhost:3000") + "/api/finalize-room";
const NEXT_SHARED_SECRET = process.env.NEXT_SHARED_SECRET || "change_me_now";

const BATCH = Number(process.env.STREAM_BATCH || 10);
const BLOCK_MS = Number(process.env.STREAM_BLOCK_MS || 2000);

const MAX_RETRIES = Number(process.env.STREAM_MAX_RETRIES || 5); // deliveries > MAX_RETRIES => dead-letter
const INITIAL_BACKOFF_MS = Number(process.env.INITIAL_BACKOFF_MS || 5000);
const MAX_BACKOFF_MS = Number(process.env.MAX_BACKOFF_MS || 60000);

const DEAD_LIST = process.env.STREAM_DEAD_LIST || "persist:dead";
const TRIM_MAXLEN = Number(process.env.STREAM_TRIM_MAXLEN || 20000); // 0 to disable
const TRIM_POLICY = process.env.STREAM_TRIM_POLICY || "~";           // approximate trim

const HTTP_TIMEOUT_MS = Number(process.env.HTTP_TIMEOUT_MS || 8000);

// finalize_room.lua emits `participants` as plain userId strings (the API
// wants { userId, joinedAt? } objects) and the call's end time as
// `finalizedAt` (the API reads `endedAt`).
function normalizePayload(payload: any) {
  if (!payload) return payload;
  return {
    ...payload,
    endedAt: payload.endedAt ?? payload.finalizedAt,
    participants: Array.isArray(payload.participants)
      ? payload.participants.map((p: unknown) => (typeof p === "string" ? { userId: p } : p))
      : payload.participants,
  };
}

function parseEntry(entry: any): { id: string; payload?: any } | null {
  // entry => [id, [field, value, ...]]
  if (!Array.isArray(entry) || entry.length < 2) return null;
  const id = entry[0];
  const fields = entry[1] as string[];
  const obj: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
  const raw = obj["room"] ?? obj["payload"];
  if (!raw) return { id, payload: undefined };
  try {
    return { id, payload: normalizePayload(JSON.parse(raw)) };
  } catch {
    return { id, payload: undefined };
  }
}

async function ensureGroup() {
  try {
    await redis.xgroup("CREATE", STREAM_KEY, GROUP, "0", "MKSTREAM");
    console.log("[worker] consumer group created:", GROUP);
  } catch (err: any) {
    if (err?.message?.includes("BUSYGROUP")) {
      console.log("[worker] consumer group exists:", GROUP);
    } else {
      throw err;
    }
  }
}

function backoffFor(deliveries: number) {
  // deliveries is >=1; for first retry use INITIAL_BACKOFF_MS, then double up to MAX_BACKOFF_MS
  const pow = Math.max(0, deliveries - 1);
  return Math.min(INITIAL_BACKOFF_MS * Math.pow(2, pow), MAX_BACKOFF_MS);
}

async function postToNext(payload: any, signal?: AbortSignal) {
  const init: RequestInit = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-shared-secret": NEXT_SHARED_SECRET,
    },
    body: JSON.stringify(payload),
    signal,
  };
  const res = await fetch(NEXT_FINALIZE_ENDPOINT, init);
  const text = await res.text();
  return { ok: res.ok, status: res.status, bodyText: text };
}

async function ackAndDelete(ids: string[]) {
  if (!ids.length) return;
  try {
    await redis.xack(STREAM_KEY, GROUP, ...ids);
  } catch (e) {
    console.error("[worker] XACK error", e);
  }
  try {
    await redis.xdel(STREAM_KEY, ...ids);
  } catch (e) {
    console.error("[worker] XDEL error", e);
  }
}

async function moveToDeadAndDelete(id: string, reason: string, extra?: any) {
  try {
    await redis.lpush(DEAD_LIST, JSON.stringify({ id, reason, at: Date.now(), ...extra }));
  } catch (e) {
    console.error("[worker] push to dead failed", e);
  }
  await ackAndDelete([id]);
}

async function processFresh() {
  // Read NEW messages only (">")
  const res: any = await redis.xreadgroup(
    "GROUP", GROUP, CONSUMER,
    "COUNT", BATCH,
    "BLOCK", BLOCK_MS,
    "STREAMS", STREAM_KEY, ">"
  );
  if (!res) return;

  // res => [[streamKey, [[id, [f,v...]], ...]]]
  const entries = (res[0] && res[0][1]) || [];
  const successes: string[] = [];

  for (const entry of entries) {
    const parsed = parseEntry(entry);
    if (!parsed) continue;
    const id = parsed.id;

    if (!parsed.payload) {
      console.warn("[worker] malformed payload (fresh), id=", id);
      await moveToDeadAndDelete(id, "malformed_payload");
      continue;
    }

    // POST to Next with timeout
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
      const { ok, status, bodyText } = await postToNext(parsed.payload, controller.signal);
      clearTimeout(t);

      if (ok) {
        successes.push(id);
        console.log("[worker] persisted room", parsed.payload.roomId ?? "(no-id)", "id=", id);
      } else if (status >= 400 && status < 500) {
        console.warn("[worker] 4xx client error -> dead-letter", status, bodyText, "id=", id);
        await moveToDeadAndDelete(id, "http_4xx", { status, bodyText, payload: parsed.payload });
      } else {
        // 5xx / unknown -> leave pending to retry later
        console.error("[worker] 5xx server error, will retry later", status, bodyText, "id=", id);
      }
    } catch (err: any) {
      console.error("[worker] network/timeout, will retry later, id=", id, err?.message ?? err);
    }
  }

  if (successes.length) await ackAndDelete(successes);
}

async function processPendingWithBackoff() {
  // Inspect pending summary (oldest first, up to BATCH)
  // XPENDING -> [[id, consumer, idle, deliveries], ...]
  const summary: any[] = await redis.xpending(STREAM_KEY, GROUP, "-", "+", BATCH);
  if (!summary || !summary.length) return;

  const toClaim: string[] = [];
  const toDead: string[] = [];
  // decide which we should claim now (idle >= backoffFor(deliveries))
  for (const row of summary) {
    const id = row[0] as string;
    const idle = Number(row[2] || 0);
    const deliveries = Number(row[3] || 0);

    if (deliveries > MAX_RETRIES) {
      toDead.push(id);
      continue;
    }
    const needIdle = backoffFor(deliveries);
    if (idle >= needIdle) toClaim.push(id);
  }

  // move over-retried to dead
  for (const id of toDead) {
    console.warn("[worker] moving to dead: too_many_deliveries id=", id);
    await moveToDeadAndDelete(id, "too_many_deliveries");
  }

  if (!toClaim.length) return;

  // Claim entries to this consumer (JUSTID to get ids quickly)
  const claimedIds = (await redis.xclaim(
    STREAM_KEY, GROUP, CONSUMER,
    Math.max(INITIAL_BACKOFF_MS, 1000), // min idle to claim
    ...toClaim,
    "JUSTID"
  )) as string[];

  if (!claimedIds || !claimedIds.length) return;

  // Fetch the full entries by ID and process like fresh
  const first = claimedIds[0];
  const last = claimedIds[claimedIds.length - 1];
  const range: any[] = await redis.xrange(STREAM_KEY, first, last);
  const byId = new Map<string, any>();
  for (const e of range) byId.set(e[0], e);

  const successes: string[] = [];
  for (const id of claimedIds) {
    const entry = byId.get(id);
    if (!entry) continue;

    const parsed = parseEntry(entry);
    if (!parsed || !parsed.payload) {
      console.warn("[worker] malformed payload (pending), id=", id);
      await moveToDeadAndDelete(id, "malformed_payload");
      continue;
    }

    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS);
      const { ok, status, bodyText } = await postToNext(parsed.payload, controller.signal);
      clearTimeout(t);

      if (ok) {
        successes.push(id);
        console.log("[worker] persisted (retry) room", parsed.payload.roomId ?? "(no-id)", "id=", id);
      } else if (status >= 400 && status < 500) {
        console.warn("[worker] 4xx client error (retry) -> dead-letter", status, bodyText, "id=", id);
        await moveToDeadAndDelete(id, "http_4xx", { status, bodyText, payload: parsed.payload });
      } else {
        // leave pending for next backoff window
        console.error("[worker] 5xx server error (retry), keep pending, id=", id, status, bodyText);
      }
    } catch (err: any) {
      console.error("[worker] network/timeout (retry), keep pending, id=", id, err?.message ?? err);
    }
  }

  if (successes.length) await ackAndDelete(successes);
}

// -------------- main loop -----------------

async function logPendingCounts() {
  try {
    const info: any = await redis.xpending(STREAM_KEY, GROUP);
    // info => { count, min, max, consumers: [ {name, pending}, ... ] } in some clients;
    // ioredis returns an array variant sometimes; wrap defensively:
    if (Array.isArray(info)) {
      console.log("[worker] XPENDING summary:", info);
    } else {
      console.log("[worker] pending count:", info?.count, "consumers:", info?.consumers?.length);
    }
  } catch (e) {
    console.error("[worker] XPENDING summary failed", e);
  }
}

async function maybeTrimStream() {
  if (!TRIM_MAXLEN || TRIM_MAXLEN <= 0) return;
  try {
    await redis.xtrim(STREAM_KEY, "MAXLEN", TRIM_MAXLEN);
  } catch (e) {
    // not fatal
  }
}

async function main() {
  await ensureGroup();

  // periodic health logs
  setInterval(() => {
    logPendingCounts().catch(() => {});
  }, 15000);

  while (true) {
    try {
      // 1) Process new messages quickly
      await processFresh();

      // 2) Process pending (stuck) with exponential backoff policy
      await processPendingWithBackoff();

      // 3) Optional trim
      await maybeTrimStream();
    } catch (e) {
      console.error("[worker] loop error", e);
    } finally {
      // small idle to avoid busy-looping
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

process.on("SIGINT", async () => {
  console.log("[worker] shutting down...");
  try { await redis.quit(); } catch {}
  process.exit(0);
});

main().catch((e) => {
  console.error("[worker] fatal on startup:", e);
  process.exit(1);
});
