import { io, Socket } from "socket.io-client";
import { useEffect, useRef, useReducer, useCallback } from "react";

// ---- Types ----
export type PeerInfo = { userId: string; username?: string };
export type SignalingStatus = "idle" | "searching" | "matched" | "ended";

type State = {
  status: SignalingStatus;
  peer: PeerInfo | null;
  roomId: string | null;
  filterApplied: string | null;
};

type Action =
  | { type: "SET_STATUS"; payload: SignalingStatus }
  | { type: "SET_MATCH"; payload: { peer: PeerInfo; roomId: string | null } }
  | { type: "END" }
  | { type: "RESET" }
  | { type: "SET_FILTER"; payload: string };

// ---- Reducer ----
function reducer(state: State, action: Action): State {
  // console.log(
  //   "%c[useSignaling → reducer]",
  //   "color: #8ef; font-weight: bold",
  //   "Action:",
  //   action,
  //   "Prev State:",
  //   state
  // );

  switch (action.type) {
    case "SET_STATUS":
      return { ...state, status: action.payload };
    case "SET_MATCH":
      return {
        ...state,
        status: "matched",
        peer: action.payload.peer,
        roomId: action.payload.roomId,
      };
    case "END":
      return { ...state, status: "ended", peer: null, roomId: null };
    case "RESET":
      return {
        status: "idle",
        peer: null,
        roomId: null,
        filterApplied: state.filterApplied,
      };
    case "SET_FILTER":
      return { ...state, filterApplied: action.payload };
    default:
      return state;
  }
}

// ---- Constants ----
const INITIAL: State = {
  status: "idle",
  peer: null,
  roomId: null,
  filterApplied: null,
};

let socket: Socket | null = null;
const SIGNALING =
  process.env.NEXT_PUBLIC_SIGNALING_URL || "http://localhost:8080";

let currentIdentity: {
  userId: string;
  username?: string;
  gender?: string;
} | null = null;
let lastMatchedRoomId: string | null = null;
let lastMatchRequestAt = 0;

// ---- Utility for colored logs ----
function log(prefix: string, ...args: unknown[]) {
  // console.log(
  //   `%c[Signaling:${prefix}]`,
  //   "color: #ffb100; font-weight: bold",
  //   ...args
  // );
}

function normPref(p?: string | null) {
  const v = (p ?? "random").toLowerCase();
  return v === "male" || v === "female" ? v : "random";
}

// ---- Socket Init ----
export function initSocket(url = SIGNALING, genderPref?: string) {
  if (socket) return socket;
  log("initSocket", "Creating new socket connection →", url);

  socket = io(url, {
    transports: ["websocket"],
    autoConnect: true,
  });

  socket.on("connect_error", (err) =>
    console.error("[Signaling:connect_error]", err)
  );

  socket.on("connect", () => {
    log("connect", "Connected ✅ Socket ID:", socket?.id);
    if (currentIdentity) {
      log("connect", "Re-authenticating user:", currentIdentity);
      socket!.emit("auth", currentIdentity);
    }
  });

  socket.on("disconnect", (reason) =>
    log("disconnect", "Socket disconnected:", reason)
  );

  return socket;
}

// ---- Authentication ----
export function connectAuth(
  userId: string,
  username?: string,
  gender?: string
) {
  if (!userId) throw new Error("connectAuth requires userId");
  initSocket();
  if (!socket) throw new Error("socket not initialized");

  currentIdentity = { userId, username, gender };
  log("auth", "Sending auth payload:", currentIdentity);
  socket.emit("auth", currentIdentity);
}

// ---- Disconnect ----
export function disconnectSocket() {
  if (!socket) return;
  log("disconnectSocket", "Disconnecting manually");
  try {
    socket.disconnect();
  } finally {
    socket = null;
    currentIdentity = null;
    lastMatchedRoomId = null;
  }
}

// ---- Core Emits ----
export function startMatch(genderPref?: string) {
  const pref = normPref(genderPref);

  initSocket(SIGNALING, pref);

  if (!socket) return false;

  if (pref && socket) {
    socket.io.opts.query = { pref };
  }

  const now = Date.now();
  if (now - lastMatchRequestAt < 300) {
    log("match", "Debounced (too soon)");
    return false;
  }

  lastMatchRequestAt = now;
  log("match", "Emitting → match:request", { pref });
  socket.emit("match:request", { pref });
  return true;
}

export function endRoom(roomId?: string) {
  if (!socket) return;
  log("endRoom", "Ending room:", roomId);
  socket.emit("end:room", { roomId });
}

// ---- Event Hooks ----
export function onMatchFound(
  cb: (data: { peerId: string; peerUsername?: string; roomId?: string }) => void
) {
  initSocket();
  if (!socket) throw new Error("Socket not initialized");

  const handler = (data: {
    peerId: string;
    peerUsername?: string;
    roomId?: string;
  }) => {
    log("onMatchFound", "Received match:", data);
    cb(data);
  };

  socket.on("match:found", handler);
  return () => socket?.off("match:found", handler);
}

export function onAuthOk(cb: () => void): () => void {
  initSocket();
  if (!socket) throw new Error("Socket not initialized");

  const handler = () => {
    log("auth:ok", "Auth confirmed ✅");
    cb();
  };

  socket.on("auth:ok", handler);
  return () => {
    if (socket) {
      socket.off("auth:ok", handler);
    }
  };
}

export function onMatchQueued(cb: () => void) {
  initSocket();
  if (!socket) throw new Error("Socket not initialized");

  const handler = () => {
    log("match:queued", "No peer yet → queued 🕒");
    cb();
  };

  socket.on("match:queued", handler);
  return () => socket?.off("match:queued", handler);
}

export function onMatchError(cb: (err: unknown) => void) {
  initSocket();
  if (!socket) throw new Error("Socket not initialized");

  const handler = (err: unknown) => {
    log("match:error", "Error occurred ❌", err);
    cb(err);
  };

  socket.on("match:error", handler);
  return () => socket?.off("match:error", handler);
}

export type NMUpdatePayload = {
  tier: string;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  newAchievements: { key: string; name: string; description: string }[];
  milestoneStreak: number | null;
};

export function onNMUpdate(cb: (data: NMUpdatePayload) => void) {
  initSocket();
  if (!socket) throw new Error("Socket not initialized");

  const handler = (data: NMUpdatePayload) => {
    log("nm:update", "NM score update:", data);
    cb(data);
  };

  socket.on("nm:update", handler);
  return () => socket?.off("nm:update", handler);
}

export function onEndOk(cb: () => void) {
  initSocket();
  if (!socket) throw new Error("Socket not initialized");

  const handler = () => {
    log("end:ok", "Chat ended gracefully ✅");
    cb();
  };

  socket.on("end:ok", handler);
  return () => socket?.off("end:ok", handler);
}

// ---- Main Hook ----
export function useSignaling({
  userId,
  username,
  gender,
  genderPreference,
}: {
  userId: string;
  username?: string;
  gender?: string;
  genderPreference?: string;
}) {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const socketRef = useRef<Socket | null>(null);
  const statusRef = useRef<SignalingStatus>("idle");
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hbTimerRef = useRef<NodeJS.Timeout | null>(null);
  const processedMatchRef = useRef<string | null>(null);

  useEffect(() => {
    statusRef.current = state.status;
  }, [state.status]);

  // ---- Socket Event Handlers ----x₹
  useEffect(() => {
    if (!userId) {
      log("useEffect", "Skipped init → Missing userId");
      return;
    }

    const s = initSocket(SIGNALING, normPref(genderPreference));
    socketRef.current = s;
    currentIdentity = { userId, username, gender };

    log("init", "User session initialized:", { userId, username, gender });

    const cleanupFns: Array<() => void> = [];

    // Auth on connect
    const onConnect = () => {
      log("connect", "Socket connected → Emitting auth");
      s.emit("auth", currentIdentity);
    };
    s.on("connect", onConnect);
    cleanupFns.push(() => s.off("connect", onConnect));

    // Auth immediately if already connected
    if (s.connected) {
      log("init", "Already connected → sending auth immediately");
      s.emit("auth", currentIdentity);
    }

    // Heartbeat
    const startHeartbeat = () => {
      if (hbTimerRef.current) clearInterval(hbTimerRef.current);
      hbTimerRef.current = setInterval(() => {
        if (socketRef.current?.connected) {
          socketRef.current.emit("heartbeat", {});
          log("heartbeat", "Ping sent ❤️");
        }
      }, 10_000);
    };
    startHeartbeat();

    // FIXED: Match found - ensure we only process once
    const onFound = (data: {
      peerId: string;
      peerUsername?: string;
      roomId?: string;
    }) => {
      const rid = data.roomId ?? null;

      // FIXED: Prevent duplicate processing
      if (rid) {
        if (processedMatchRef.current === rid) {
          log(
            "match:found",
            "Already processed this match, ignoring duplicate",
            rid
          );
          return;
        }

        if (lastMatchedRoomId === rid) {
          log(
            "match:found",
            "Duplicate roomId detected, but not yet processed",
            rid
          );
        }

        processedMatchRef.current = rid;
        lastMatchedRoomId = rid;
      }

      log("match:found", "Processing match 🎯", data);

      // Immediately update status to matched
      dispatch({
        type: "SET_MATCH",
        payload: {
          peer: { userId: data.peerId, username: data.peerUsername },
          roomId: rid,
        },
      });

      // Join room
      if (rid) {
        log("match:found", "Joining room:", rid);
        s.emit("room:join", { roomId: rid });
      }

      // Clear any retry timers
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
    s.on("match:found", onFound);
    cleanupFns.push(() => s.off("match:found", onFound));

    // Queued
    const onQueued = () => {
      // FIXED: Only set to searching if not already matched
      if (statusRef.current !== "matched") {
        dispatch({ type: "SET_STATUS", payload: "searching" });
        log("match:queued", "Queued for matching 🔄");
      } else {
        log("match:queued", "Already matched, ignoring queued event");
        return;
      }

      if (retryTimerRef.current) return;
      retryTimerRef.current = setTimeout(
        () => {
          retryTimerRef.current = null;
          if (statusRef.current !== "matched") {
            const ok = startMatch(genderPreference);
            log("match:queued", "Re-emitted match request → ok?", ok);
            if (!ok) socketRef.current?.emit("match:request");
          }
        },
        300 + Math.floor(Math.random() * 500)
      );
    };
    s.on("match:queued", onQueued);
    cleanupFns.push(() => s.off("match:queued", onQueued));

    // Errors
    const onMatchErr = (err: unknown) => {
      log("match:error", "Error caught:", err);
      const msg = typeof err === "string" ? err : String(err);
      // FIXED: Only requeue if not already matched
      if (msg.includes("NO_PEER") && statusRef.current !== "matched") {
        onQueued();
      }
    };
    s.on("match:error", onMatchErr);
    cleanupFns.push(() => s.off("match:error", onMatchErr));

    // End event
    const onEnd = () => {
      log("end:ok", "Room ended → cleaning up");
      dispatch({ type: "END" });
      lastMatchedRoomId = null;
      processedMatchRef.current = null;
    };
    s.on("end:ok", onEnd);
    cleanupFns.push(() => s.off("end:ok", onEnd));

    // System messages
    const onSystem = (payload: { text?: string }) => {
      const t = (payload?.text || "").toLowerCase();
      log("chat:system", "System message received:", payload);
      if (t.includes("chat ended") || t.includes("user disconnected")) {
        log("chat:system", "Detected end message → cleaning up");
        dispatch({ type: "END" });
        lastMatchedRoomId = null;
        processedMatchRef.current = null;
      }
    };
    s.on("chat:system", onSystem);
    cleanupFns.push(() => s.off("chat:system", onSystem));

    // FIXED: Listen for peer left events
    const onPeerLeft = () => {
      log("rtc:peer-left", "Peer has left the room");
      dispatch({ type: "END" });
      lastMatchedRoomId = null;
      processedMatchRef.current = null;
    };
    s.on("rtc:peer-left", onPeerLeft);
    cleanupFns.push(() => s.off("rtc:peer-left", onPeerLeft));

    // Cleanup
    return () => {
      log("cleanup", "Cleaning up socket listeners and timers...");
      cleanupFns.forEach((fn) => fn());
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      if (hbTimerRef.current) {
        clearInterval(hbTimerRef.current);
        hbTimerRef.current = null;
      }
      socketRef.current = null;
    };
  }, [userId, username, gender, genderPreference]);

  // ---- start / next / end / teardown ----
  const start = useCallback(() => {
    log("start", "User requested start");
    if (!socketRef.current) {
      initSocket();
      socketRef.current = socket;
    }
    lastMatchedRoomId = null;
    processedMatchRef.current = null;
    const ok = startMatch(genderPreference);
    log("start", "Match request emitted, ok?", ok);
    if (!ok) socketRef.current?.emit("match:request");
    dispatch({ type: "SET_STATUS", payload: "searching" });
  }, []);

  const next = useCallback(() => {
    log("next", "User requested NEXT");
    const rid = state.roomId;
    if (rid) socketRef.current?.emit("end:room", { roomId: rid });
    dispatch({ type: "RESET" });
    lastMatchedRoomId = null;
    processedMatchRef.current = null;
    setTimeout(() => {
      socketRef.current?.emit("match:request");
      dispatch({ type: "SET_STATUS", payload: "searching" });
    }, 200);
  }, [state.roomId]);

  const end = useCallback(() => {
    log("end", "User requested END");
    const rid = state.roomId;
    if (rid) socketRef.current?.emit("end:room", { roomId: rid });
    dispatch({ type: "END" });
    lastMatchedRoomId = null;
    processedMatchRef.current = null;
  }, [state.roomId]);

  const teardown = useCallback(() => {
    log("teardown", "Manual teardown triggered");
    try {
      socketRef.current?.disconnect();
    } catch (err) {
      console.error("[Signaling:teardown] error", err);
    }
    socketRef.current = null;
    currentIdentity = null;
    lastMatchedRoomId = null;
    processedMatchRef.current = null;
  }, []);

  return {
    status: state.status,
    peer: state.peer,
    roomId: state.roomId,
    start,
    next,
    end,
    teardown,
    socket: socketRef.current,
  };
}
