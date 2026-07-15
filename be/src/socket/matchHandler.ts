import type { Server, Socket } from "socket.io";
import { redis, pub } from "../utils/redis/redisClient";
import { scripts } from "../utils/redis/scripts";
import { handleChatRoomJoin } from "./chatHandlers";
import { sendPushNotification } from "../utils/pushClient";

const STALE_MS = Number(process.env.STALE_MS || 30_000);
const MATCH_TIMEOUT_MS = 15_000;

export async function handleMatchRequest(
  io: Server,
  socket: Socket,
  payload: { pref?: string }
) {
  const userId = socket.data.userId as string;
  const userGender = socket.data.gender as string;

  if (!userId) return socket.emit("match:error", "not-authenticated");

  const genderPreference = (payload?.pref || "random").toLowerCase();
  const now = Date.now();

  try {
    // Check if user is already matched or in a room
    const u = await redis.hgetall(`user:${userId}`);
    if (
      u &&
      (u.status === "matched" || (u.currentRoom && u.currentRoom !== ""))
    ) {
      console.warn("[match] user already in room", {
        userId,
        status: u.status,
      });
      return socket.emit("match:error", "already-in-room");
    }

    // CRITICAL: Normalize gender values
    const normalizedUserGender = userGender.toLowerCase();
    const normalizedGenderPref = genderPreference.toLowerCase();

    console.log(
      `[match] 🔍 User ${userId} (gender: ${normalizedUserGender}) looking for: ${normalizedGenderPref}`
    );

    // Mark user as available with their preference
    await redis.hset(
      `user:${userId}`,
      "status",
      "available",
      "lastSeen",
      String(now),
      "currentRoom",
      "",
      "gender",
      normalizedUserGender, // Store normalized
      "prefGender",
      normalizedGenderPref // Store normalized
    );

    // Add to appropriate availability pool based on THEIR gender (not preference)
    const poolKey = getPoolKey(normalizedUserGender);
    await redis.sadd(poolKey, userId);
    await redis.zadd(`${poolKey}_by_time`, now, userId);

    console.log(`[match] 📍 Added ${userId} to pool ${poolKey}`);

    // Debug: Check what's actually stored
    const storedData = await redis.hgetall(`user:${userId}`);
    console.log(`[match] 💾 Stored data for ${userId}:`, storedData);

    // Call enhanced Lua script with preference
    const raw: any = await redis.evalsha(
      scripts.matchSha!,
      0,
      userId,
      String(now),
      String(STALE_MS),
      normalizedGenderPref, // ARGV[4]
      normalizedUserGender // ARGV[5]
    );

    let parsed: any = null;
    if (typeof raw === "string" && raw.startsWith("{")) {
      try {
        parsed = JSON.parse(raw);
      } catch {}
    } else if (raw && typeof raw === "object") {
      parsed = raw;
    }

    if (parsed) {
      if (parsed.ok) {
        const peerId = parsed.candidate;
        const rid = parsed.roomId;

        console.log("[match] ✅ MATCH SUCCESS", {
          userId,
          peerId,
          roomId: rid,
          userGender: normalizedUserGender,
          userPref: normalizedGenderPref,  
        });

        // Update both users' status
        await Promise.all([
          redis.hset(`user:${userId}`, "status", "matched", "currentRoom", rid),
          redis.hset(`user:${peerId}`, "status", "matched", "currentRoom", rid),
        ]);

        // Get peer info
        const peerHash = await redis.hgetall(`user:${peerId}`);
        const peerUsername = peerHash.username || peerHash.name || peerId;
        const peerSocketId = peerHash.socketId;

        // Get requester info
        // const requesterHash = await redis.hgetall(`user:${userId}`);
        const requesterUsername = socket.data.username || userId;

        // Emit to both users
        socket.emit("match:found", {
          peerId,
          peerUsername,
          roomId: rid,
        });

        if (peerSocketId) {
          io.to(peerSocketId).emit("match:found", {
            peerId: userId,
            peerUsername: requesterUsername,
            roomId: rid,
          });
        }

        // Tell both clients to start WebRTC negotiation
        const offerer = userId;
        socket.emit("rtc:ready", { roomId: rid, offerer });
        if (peerSocketId)
          io.to(peerSocketId).emit("rtc:ready", { roomId: rid, offerer });

        // Publish for cross-server
        await pub.publish(
          "pubsub:presence",
          `matched|${rid}|${userId}|${peerId}`
        );

        // Best-effort: pull either side back to the app if they backgrounded
        // it while waiting. Never awaited into the match path — push
        // delivery must not add latency or failure modes to matchmaking.
        void sendPushNotification(
          [userId, peerId],
          "Match found!",
          "Someone's ready to chat — jump back in.",
          { type: "match", roomId: rid }
        );

        return;
      }

      // Handle no match scenarios
      const errCode = String(parsed.err || "").toUpperCase();
      if (
        errCode === "NO_PEER" ||
        errCode === "STALE_PEER" ||
        errCode === "NOT_AVAILABLE" ||
        errCode === "PREF_MISMATCH"
      ) {
        await redis.hset(
          `user:${userId}`,
          "status",
          "available",
          "lastSeen",
          String(Date.now())
        );
        socket.emit("match:queued", { filter: normalizedGenderPref });
        console.log("[match] 🕒 Queued", {
          userId,
          filter: normalizedGenderPref,
          reason: errCode,
        });

        // Set timeout for filtered searches
        if (normalizedGenderPref !== "random") {
          setTimeout(async () => {
            const currentStatus = await redis.hget(`user:${userId}`, "status");
            if (currentStatus === "available") {
              socket.emit("match:timeout", {
                filter: normalizedGenderPref,
                message: `No ${normalizedGenderPref} users available right now. Try "Random" or wait.`,
              });
            }
          }, MATCH_TIMEOUT_MS);
        }

        return;
      }

      console.warn("[match] Script error", { userId, errCode });
      return socket.emit("match:error", errCode || "match_failed");
    }

    // Default: queue
    await redis.hset(
      `user:${userId}`,
      "status",
      "available",
      "lastSeen",
      String(Date.now())
    );
    socket.emit("match:queued", { filter: normalizedGenderPref });
  } catch (e: any) {
    console.error("[match] Error:", e, { userId });
    return socket.emit("match:error", String(e?.message || e));
  }
}

// Helper: Get pool key based on user's actual gender
function getPoolKey(gender: string): string {
  const normalized = gender?.toLowerCase();
  if (normalized === "male") return "available:male";
  if (normalized === "female") return "available:female";
  return "available:random";
}
