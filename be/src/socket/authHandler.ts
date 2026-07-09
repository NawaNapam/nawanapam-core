import { Socket } from "socket.io";
import { redis } from "../utils/redis/redisClient";
import { registerNMSession } from "../utils/nmScoreClient";

export async function handleAuth(socket: Socket, payload: any) {
  const { userId, username, gender } = payload || {};
  if (!userId) {
    socket.emit("auth:error", "userId required");
    return;
  }

  socket.data.userId = userId;
  socket.data.username = username ?? "";
  socket.data.gender = gender ?? ""; // Store user's actual gender

  const now = Date.now();

  await redis.hset(`user:${userId}`, {
    status: "available",
    socketId: socket.id,
    lastSeen: String(now),
    username: username ?? "",
    gender: gender ?? "", // Persist gender in Redis
    currentRoom: ""
  });


  // presence TTL
  await redis.expire(`user:${userId}`, 30);

  socket.emit("auth:ok");
  console.log(`[auth] User ${userId} authenticated with gender: ${gender}`);

  // NM Score: register today's session / advance streak, then cache the
  // resulting priority score into Redis for the matchmaking Lua script to
  // read without a DB round-trip. Fire-and-forget: never blocks matching.
  registerNMSession(userId).then(async (result) => {
    if (!result) return;
    await redis.hset(`user:${userId}`, {
      nmScore: String(result.nmScore),
      nmTier: result.nmTier,
    });
    socket.emit("nm:update", {
      tier: result.nmTier,
      xp: result.xp,
      currentStreak: result.currentStreak,
      longestStreak: result.longestStreak,
      newAchievements: result.newAchievements,
      milestoneStreak: result.milestoneStreak,
    });
  });
}