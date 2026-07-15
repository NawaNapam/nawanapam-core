"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  ArrowLeft,
  Send,
  Globe,
  X,
  RotateCcw,
  Power,
  Users,
  User,
  MessageCircle,
  Camera,
  SwitchCamera,
  CameraOff,
  Flag,
  MoreVertical,
  Play,
} from "lucide-react";
import { toast } from "@/services/toast";
import { useSession } from "next-auth/react";

import { useGetUser } from "@/hooks/use-getuser";
import { useRoomChat } from "@/hooks/useRoomChat";
import { useSignaling, onAuthOk, onNMUpdate } from "@/hooks/SocketProvider";
import { useWebRTC } from "@/hooks/useWebRTC";
import StreakMilestoneModal from "./StreakMilestoneModal";
import "@/styles/ext.css";
import { Switch } from "@radix-ui/react-switch";

interface VideoChatPageProps {
  gender: string;
}

export default function VideoChatPage({ gender }: VideoChatPageProps) {
  // UI state
  const [currentTime, setCurrentTime] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStreamReady, setLocalStreamReady] = useState(false);
  const [remoteStreamReady, setRemoteStreamReady] = useState(false);
  // Tracks actual decoded-frame playback (not just stream attachment or the
  // `playing` event) so the browser's own "tap to play" chrome — shown while
  // autoplay is blocked, or while a live MediaStream track has attached but
  // not yet decoded a real frame — never peeks through; our overlay covers
  // the element until video is genuinely rendering.
  const [remoteVideoPlaying, setRemoteVideoPlaying] = useState(false);
  const checkRemoteVideoPlaying = (el: HTMLVideoElement) => {
    const hasFrame = !el.paused && el.videoWidth > 0;
    setRemoteVideoPlaying(hasFrame);

    // Remote video starts muted so autoplay is guaranteed to succeed (no
    // browser/webview ever blocks muted autoplay). Unmuting an already-playing
    // element isn't subject to that gate, so this is safe to do the moment we
    // can prove real frames are flowing — avoids ever needing a user gesture.
    if (hasFrame && el.muted) {
      el.muted = false;
    }
  };
  const [userInteracted, setUserInteracted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isStreamSwapped, setIsStreamSwapped] = useState(false); // Track if streams are swapped
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">(
    "user",
  );
  const [selfPos, setSelfPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    dragging: boolean;
  } | null>(null);
  const swapDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // refs
  const selfVideoMobileRef = useRef<HTMLVideoElement | null>(null);
  const selfVideoDesktopRef = useRef<HTMLVideoElement | null>(null);
  const strangerVideoMobileRef = useRef<HTMLVideoElement | null>(null);
  const strangerVideoDesktopRef = useRef<HTMLVideoElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const hasStartedRef = useRef(false);
  const localStreamRef = useRef<MediaStream | null>(null);

  // track current breakpoint so we choose the visible element
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const set = () => setIsDesktop(mql.matches);
    set();
    mql.addEventListener
      ? mql.addEventListener("change", set)
      : mql.addListener(set);
    return () => {
      mql.removeEventListener
        ? mql.removeEventListener("change", set)
        : mql.removeListener(set);
    };
  }, []);

  const getSelfEl = () => {
    // prefer the element that SHOULD be visible for the current breakpoint
    const primary = isDesktop
      ? selfVideoDesktopRef.current
      : selfVideoMobileRef.current;
    const fallback = isDesktop
      ? selfVideoMobileRef.current
      : selfVideoDesktopRef.current;
    return primary ?? fallback ?? null;
  };

  const getRemoteEl = () => {
    const primary = isDesktop
      ? strangerVideoDesktopRef.current
      : strangerVideoMobileRef.current;
    const fallback = isDesktop
      ? strangerVideoMobileRef.current
      : strangerVideoDesktopRef.current;
    return primary ?? fallback ?? null;
  };

  // auth / router
  const user = useGetUser();
  const userId = user?.id ?? null;
  const username = user?.username ?? user?.name ?? undefined;
  const { status: sessionStatus, data: session } = useSession();
  const router = useRouter();

  // console.log("[VideoChatPage] User data:", { userId, username, user });

  // signaling
  const { status, peer, roomId, start, next, end, socket } = useSignaling(
    useMemo(
      () => ({
        userId: userId ?? "",
        username,
        gender: user?.gender,
        genderPreference: gender as string,
      }),
      [userId, username, user?.gender, gender],
    ),
  );

  // text chat
  const {
    messages: chatMessages,
    send: sendChatMessage,
    reset: clearChat,
  } = useRoomChat({
    socket,
    roomId: roomId ?? null,
    selfUserId: userId ?? "",
    selfUsername: username,
  });

  // --- WebRTC hook ---
  const {
    cleanupRemote,
    toggleAudio,
    toggleVideo,
    attachLocal,
    attachRemote,
    replaceVideoTrack,
    connected,
  } = useWebRTC({
    socket,
    roomId: roomId ?? null,
    selfUserId: userId ?? "",
    localStreamRef,
  });

  useEffect(() => {
    const enablePlayback = () => {
      // console.log(
      //   "[Mobile] 📱 User interaction detected - enabling video playback"
      // );
      setUserInteracted(true);

      const selfEl = getSelfEl();
      const remoteEl = getRemoteEl();

      if (selfEl?.srcObject && selfEl.paused) {
        const p = selfEl.play();
        if (p && typeof p.catch === "function")
          p.catch((e) => {
            if (e.name !== "AbortError") {
              console.warn("[Mobile] Self video play failed:", e);
            }
          });
      }
      if (remoteEl?.srcObject && remoteEl.paused) {
        const p = remoteEl.play();
        if (p && typeof p.catch === "function")
          p.catch((e) => {
            if (e.name !== "AbortError") {
              console.warn("[Mobile] Remote video play failed:", e);
            }
          });
      }
    };

    // Listen for first interaction (required for iOS)
    document.addEventListener("touchstart", enablePlayback, {
      once: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("touchstart", enablePlayback);
    };
  }, []);

  useEffect(() => {
    const el = getRemoteEl();
    if (!el) return;

    // (Re)attach remote sink whenever the target element is (re)mounted
    if (attachRemote) attachRemote(el);

    const onMeta = () => {
      // console.log("[VideoChatPage] Remote video metadata loaded");
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    el.addEventListener("loadedmetadata", onMeta);

    // Periodic nudge helps on iOS when events are missed
    const id = setInterval(() => {
      const hasStream =
        (el as HTMLVideoElement)?.srcObject instanceof MediaStream;
      setRemoteStreamReady(
        hasStream && (el?.srcObject as MediaStream).active === true,
      );
      if (hasStream && (el as HTMLVideoElement).paused && userInteracted) {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    }, 800);

    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      clearInterval(id);
    };
    // Re-run when the actual DOM target changes, or user unlocked autoplay.
  }, [
    strangerVideoMobileRef.current,
    strangerVideoDesktopRef.current,
    attachRemote,
    isDesktop,
    userInteracted,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!connected) return;
    const el = getRemoteEl();
    if (!el) return;

    // ensure the current element is the one wired to the peer
    if (attachRemote) attachRemote(el);

    // try play shortly after SRD completes
    const t = setTimeout(() => {
      if (el.srcObject) {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    }, 300);

    return () => clearTimeout(t);
  }, [
    connected,
    strangerVideoMobileRef.current,
    strangerVideoDesktopRef.current,
    attachRemote,
    isDesktop,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (!session?.user?.email || !userId) {
      router.replace("/api/auth/signin");
    }
  }, [sessionStatus, session, userId, router]);

  useEffect(() => {
    if (!userId || sessionStatus !== "authenticated") return;

    let mounted = true;

    const startLocalStream = async () => {
      try {
        // console.log("[Camera] 📹 Requesting local media...");
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!mounted) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = mediaStream;
        setLocalStreamReady(true);

        const el = getSelfEl();
        if (el) {
          // **Set attributes BEFORE attaching stream (iOS requirement)**
          el.muted = true;
          el.setAttribute("playsinline", "");
          // attach
          if (el.srcObject !== mediaStream)
            (el as HTMLVideoElement).srcObject = mediaStream;

          // play (may be deferred until user interaction on iOS)
          const p = el.play();
          if (p && typeof p.catch === "function") p.catch(() => {});

          // notify WebRTC
          if (attachLocal) attachLocal(el);

          // ensure sizing (if you rely on runtime styles)
          el.style.width = "100%";
          el.style.height = "100%";
          (el.style as CSSStyleDeclaration).objectFit = "cover";
        }
      } catch (err) {
        console.error("[Camera] ❌ Camera access failed:", err);
        toast.error("Please allow camera & microphone access");
      }
    };

    startLocalStream();
    return () => {
      mounted = false;
      // console.log("[Camera] Component effect cleanup (stream preserved)");
    };
  }, [userId, sessionStatus, attachLocal]);

  useEffect(() => {
    const el = getSelfEl();
    const stream = localStreamRef.current;
    if (!el || !stream) return;

    el.muted = true;
    el.setAttribute("playsinline", "");
    if (el.srcObject !== stream) (el as HTMLVideoElement).srcObject = stream;

    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => {});

    if (attachLocal) attachLocal(el);
  }, [
    selfVideoMobileRef.current,
    selfVideoDesktopRef.current,
    localStreamReady,
    attachLocal,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  function hardResetVideo(el?: HTMLVideoElement | null) {
    if (!el) return;
    try {
      el.pause();
    } catch {}
    (el as HTMLVideoElement).srcObject = null;
    el.removeAttribute("src");
    try {
      el.load();
    } catch {}
  }
  function stopStream(stream?: MediaStream | null) {
    if (!stream) return;
    for (const t of stream.getTracks()) {
      try {
        t.stop();
      } catch {}
    }
  }

  const handleNext = () => {
    // console.log("[Action] 🔄 User pressed NEXT");
    clearChat();
    cleanupRemote();
    setRemoteStreamReady(false);
    hasStartedRef.current = false;

    // reset remote elements so stale tracks can't stick around
    hardResetVideo(getRemoteEl());

    if (status === "matched" && roomId) {
      setTimeout(() => {
        next();
      }, 200);
    } else {
      start();
    }
    toast.info("Finding next partner...");
  };

  const handleEnd = () => {
    // console.log("[Action] ⏹️ User pressed END");
    clearChat();
    cleanupRemote();
    setRemoteStreamReady(false);
    hasStartedRef.current = false;
    end();

    // fully reset elements (iOS especially)
    hardResetVideo(getRemoteEl());
    hardResetVideo(getSelfEl());

    // Stop all tracks (both video and audio)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStreamReady(false);
    setIsVideoOff(false);
    setIsMuted(false);
    router.push("/dashboard");

    toast.info("Chat ended.");
  };

  const handleSubmitReport = async () => {
    if (!peer?.userId) {
      toast.error("No one to report right now.");
      return;
    }
    if (!reportReason.trim() || !reportMessage.trim()) {
      toast.error("Please select a reason and describe what happened.");
      return;
    }

    setIsSubmittingReport(true);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUserId: peer.userId,
          roomId: roomId ?? undefined,
          reason: reportReason,
          message: reportMessage,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit report");

      toast.success("Report submitted. Our team will review it.");
      setIsReportOpen(false);
      setReportReason("");
      setReportMessage("");
    } catch {
      toast.error("Could not submit report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleSwapStreams = () => {
    // console.log("[Action] 🔄 Swapping video streams");

    // Debounce swap to prevent rapid toggling
    if (swapDebounceRef.current) {
      clearTimeout(swapDebounceRef.current);
    }

    swapDebounceRef.current = setTimeout(() => {
      setIsStreamSwapped((prev) => !prev);
      swapDebounceRef.current = null;
    }, 50); // 50ms debounce to prevent multiple swaps from simultaneous events
  };

  const switchCamera = async () => {
    // 🚫 Desktop guard
    if (!/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) return;

    try {
      const currentStream = localStreamRef.current;
      if (!currentStream) return;

      // 1️⃣ Stop only the video track
      currentStream.getVideoTracks().forEach((t) => t.stop());

      const nextFacing = cameraFacing === "user" ? "environment" : "user";

      // 2️⃣ Request new video stream
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
        audio: false, // 🔥 keep audio from old stream
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      await replaceVideoTrack(newVideoTrack);

      // 3️⃣ Replace video track in local stream
      const updatedStream = new MediaStream([
        newVideoTrack,
        ...currentStream.getAudioTracks(),
      ]);

      localStreamRef.current = updatedStream;
      setCameraFacing(nextFacing);

      // 4️⃣ Update video element
      const el = getSelfEl();
      if (el) {
        el.muted = true;
        el.setAttribute("playsinline", "");
        el.srcObject = updatedStream;
        await el.play().catch(() => {});
      }

      // 5️⃣ Notify WebRTC hook (important)
      if (attachLocal && el) {
        attachLocal(el);
      }

      // console.log("[Camera] 🔄 Switched to:", nextFacing);
    } catch (err) {
      console.error("[Camera] Switch failed:", err);
      toast.error("Unable to switch camera");
    }
  };

  useEffect(() => {
    if (!userId || hasStartedRef.current) return;

    const unsubscribe = onAuthOk(() => {
      if (!hasStartedRef.current && (status === "idle" || status === "ended")) {
        hasStartedRef.current = true;
        start();
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [userId, status, start]);

  const [milestoneStreak, setMilestoneStreak] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onNMUpdate((data) => {
      if (data.milestoneStreak) setMilestoneStreak(data.milestoneStreak);
    });
    return () => {
      unsubscribe?.();
    };
  }, [userId]);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }) + " IST",
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    return () => {
      try {
        cleanupRemote();
      } catch (e) {
        console.error("[VideoChatPage] Error during cleanup:", e);
      }
    };
  }, [cleanupRemote]);

  useEffect(() => {
    const stopTracks = () => {
      // console.log("[Camera] 🛑 Stopping local tracks (page unload)");
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };

    window.addEventListener("beforeunload", stopTracks);
    return () => {
      window.removeEventListener("beforeunload", stopTracks);
      stopTracks();
    };
  }, []);

  useEffect(() => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    // console.log("[Device] 📱 Mobile:", isMobile);
    // console.log("[Device] 🍎 iOS:", isIOS);
    // console.log(
    //   "[Device] 📏 Viewport:",
    //   window.innerWidth,
    //   "x",
    //   window.innerHeight
    // );
    // console.log("[Device] 🌐 User Agent:", navigator.userAgent);
  }, []);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputMessage.trim();
    if (!text) return;
    sendChatMessage(text);
    setInputMessage("");
  };

  const handleStart = () => {
    if (!userId) {
      toast.error("Sign in to start matching.");
      router.push("/api/auth/signin");
      return;
    }
    if (status === "matched") return;
    clearChat();
    hasStartedRef.current = false;
    start();
  };

  const handleBackToDashboard = (e: React.MouseEvent) => {
    e.preventDefault();
    handleEnd();
    router.push("/dashboard");
  };

  const onToggleMute = () => {
    toggleAudio();
    setIsMuted((m) => !m);
  };

  const onToggleVideo = () => {
    toggleVideo();
    setIsVideoOff((v) => !v);
  };

  const chatDisabled = !(status === "matched" && roomId && connected);
  const showSearching = status === "searching";
  const showConnecting = status === "matched" && !connected;
  const isFullyConnected = status === "matched" && connected;

  // The stream can be attached (remoteStreamReady) before the browser
  // actually starts playback (autoplay is often blocked until a user
  // gesture) — without this, the raw <video> shows its own native
  // "tap to play" icon in that gap. Keeping our overlay up (with a nicer
  // prompt) until playback truly starts covers that native chrome entirely.
  const showTapToPlay =
    isFullyConnected && remoteStreamReady && !remoteVideoPlaying;
  const showRemoteWaiting =
    showSearching || (isFullyConnected && !remoteStreamReady) || showTapToPlay;

  const DRAG_THRESHOLD = 6;

  const onSelfPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: selfPos.x,
      originY: selfPos.y,
      dragging: false,
    };
  };

  const onSelfPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (!dragRef.current.dragging) {
      const dist = Math.hypot(dx, dy);
      if (dist > DRAG_THRESHOLD) {
        dragRef.current.dragging = true;
      }
    }

    if (dragRef.current.dragging) {
      setSelfPos({
        x: dragRef.current.originX + dx,
        y: dragRef.current.originY + dy,
      });
    }
  };

  const onSelfPointerUp = (e: React.PointerEvent) => {
    const wasDragging = dragRef.current?.dragging;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    dragRef.current = null;

    // ✅ TAP (not drag) → swap
    if (!wasDragging) {
      e.stopPropagation();
      handleSwapStreams();
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-surface-dark flex flex-col font-sans">
      <StreakMilestoneModal
        streak={milestoneStreak}
        onClose={() => setMilestoneStreak(null)}
      />

      {/* Report Modal */}
      {isReportOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={() => !isSubmittingReport && setIsReportOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Flag size={18} /> Report {peer?.username ?? "this user"}
              </h3>
              <button
                onClick={() => setIsReportOpen(false)}
                className="text-white/60 hover:text-white transition"
              >
                <X size={20} />
              </button>
            </div>

            <label className="block text-sm text-white/70 mb-1">Reason</label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full mb-4 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white focus:border-white/40 focus:outline-none text-sm"
            >
              <option value="" className="bg-slate-900">
                Select a reason
              </option>
              <option value="Inappropriate behavior" className="bg-slate-900">
                Inappropriate behavior
              </option>
              <option value="Harassment or abuse" className="bg-slate-900">
                Harassment or abuse
              </option>
              <option value="Nudity or sexual content" className="bg-slate-900">
                Nudity or sexual content
              </option>
              <option value="Spam or scam" className="bg-slate-900">
                Spam or scam
              </option>
              <option value="Underage user" className="bg-slate-900">
                Underage user
              </option>
              <option value="Other" className="bg-slate-900">
                Other
              </option>
            </select>

            <label className="block text-sm text-white/70 mb-1">
              What happened?
            </label>
            <textarea
              value={reportMessage}
              onChange={(e) => setReportMessage(e.target.value)}
              rows={4}
              placeholder="Describe what happened during the call..."
              className="w-full mb-5 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none text-sm resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setIsReportOpen(false)}
                disabled={isSubmittingReport}
                className="flex-1 py-2.5 rounded-xl border border-white/20 text-white hover:bg-white/10 transition disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={isSubmittingReport}
                className="flex-1 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-600 text-white font-medium transition disabled:opacity-60"
              >
                {isSubmittingReport ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className="absolute top-0 inset-x-0 px-4 pb-3 md:px-6 md:pb-4 pt-[calc(0.75rem+var(--status-bar-height))] md:pt-[calc(1rem+var(--status-bar-height))] flex items-center justify-between"
        style={{ zIndex: 60 }}
      >
        <button
          onClick={handleBackToDashboard}
          className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex md:hidden items-center justify-center text-white hover:bg-black/60 transition-all shadow-lg"
        >
          <ArrowLeft size={18} className="md:hidden" />
          <ArrowLeft size={20} className="hidden md:block" />
        </button>

        {/* Time - Desktop only */}
        <div className="hidden md:hidden items-center gap-2 text-xs font-medium text-white/60">
          <Globe size={14} className="text-white/80" />
          <span className="font-mono">{currentTime}</span>
        </div>
      </header>

      {/* Main */}
      <div className="h-full w-full flex flex-col overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 w-full relative overflow-hidden">
          {/* Mobile split-screen: 50/50 */}
          <div className="absolute inset-0 md:hidden bg-black z-[1] flex flex-col">
            <div className="relative h-1/2 w-full border-b border-white/10">
              <video
                ref={strangerVideoMobileRef}
                autoPlay
                playsInline
                muted
                webkit-playsinline="true"
                x-webkit-airplay="allow"
                className="w-full h-full object-cover bg-black"
                onLoadedMetadata={(e) => {
                  if (e.currentTarget.paused) {
                    e.currentTarget.play().catch((err) => {
                      console.log("[Video] Remote play failed:", err.name);
                    });
                  }
                }}
                onPlaying={(e) => checkRemoteVideoPlaying(e.currentTarget)}
                onLoadedData={(e) => checkRemoteVideoPlaying(e.currentTarget)}
                onTimeUpdate={(e) => checkRemoteVideoPlaying(e.currentTarget)}
                onPause={() => setRemoteVideoPlaying(false)}
                onWaiting={() => setRemoteVideoPlaying(false)}
                onEmptied={() => setRemoteVideoPlaying(false)}
              />

              {showRemoteWaiting && (
                <div className="absolute inset-0 bg-surface-dark/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 pointer-events-none">
                  {showTapToPlay ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center animate-pulse">
                        <Play size={22} className="text-white ml-0.5" fill="currentColor" />
                      </div>
                      <p className="text-xs text-white/90 font-medium text-center px-2">
                        Tap to start video
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="loader"></div>
                      <p className="text-xs text-white/90 font-medium text-center px-2">
                        {showSearching
                          ? "Finding someone for you..."
                          : "Waiting for video..."}
                      </p>
                    </>
                  )}
                </div>
              )}

              {showConnecting && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <div className="w-8 h-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-white/70">Connecting…</p>
                </div>
              )}

              {isFullyConnected && (
                <div className="absolute top-3 left-3 text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-white/15">
                  <Users size={10} /> {peer?.username ?? "Stranger"}
                </div>
              )}
            </div>

            <div className="relative h-1/2 w-full">
              <video
                ref={selfVideoMobileRef}
                autoPlay
                playsInline
                muted={true}
                webkit-playsinline="true"
                x-webkit-airplay="allow"
                className="w-full h-full object-cover bg-black"
                style={{ transform: "scaleX(-1)" }}
                onLoadedMetadata={(e) => {
                  if (e.currentTarget.paused) {
                    e.currentTarget.play().catch((err) => {
                      console.log("[Video] Local play failed:", err.name);
                    });
                  }
                }}
              />

              <div className="absolute top-3 left-3 text-white bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-white/15">
                <User size={10} /> You
              </div>

              {isVideoOff && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-2 pointer-events-none">
                  <CameraOff size={40} className="text-white/40" />
                  <p className="text-xs text-white/60">Your video is off</p>
                </div>
              )}

              {!localStreamReady && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-none">
                  <div className="w-8 h-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop/Tablet Layout */}
        <div className="hidden md:grid grid-cols-12 gap-4 absolute inset-0 w-full h-full p-4 overflow-hidden">
          {/* Main Video Area - 9 columns */}
          <div className="col-span-9 h-full w-full overflow-hidden">
            {/* Main video container */}
            <div className="relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl h-full w-full">
              {/* Show 'Finding someone for you...' in remote stream position (based on swap state) */}
              {showRemoteWaiting && !isStreamSwapped && (
                <div className="absolute inset-0 bg-surface-dark/70 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                  {showTapToPlay ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center animate-pulse">
                        <Play size={26} className="text-white ml-1" fill="currentColor" />
                      </div>
                      <p className="text-sm text-white/90 font-medium">Tap to start video</p>
                    </>
                  ) : (
                    <>
                      <div className="loader"></div>
                      <p className="text-sm text-white/90 font-medium">
                        {showSearching
                          ? "Finding someone for you..."
                          : "Waiting for video..."}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Show in PiP position when streams are swapped */}
              {showRemoteWaiting && isStreamSwapped && (
                <div
                  className="absolute bg-surface-dark/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2"
                  style={{
                    bottom: "16px",
                    right: "16px",
                    width: "192px",
                    height: "144px",
                    zIndex: 35,
                    pointerEvents: "none",
                    borderRadius: "12px",
                  }}
                >
                  {showTapToPlay ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center animate-pulse">
                        <Play size={16} className="text-white ml-0.5" fill="currentColor" />
                      </div>
                      <p className="text-xs text-white/90 font-medium text-center px-2">Tap to start</p>
                    </>
                  ) : (
                    <>
                      <div className="loader"></div>
                      <p className="text-xs text-white/90 font-medium text-center px-2">
                        {showSearching ? "Finding..." : "Waiting..."}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Show Connecting in remote stream position (based on swap state) */}
              {showConnecting && !isStreamSwapped && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-20">
                  <div className="w-10 h-10 border-4 border-white/40 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-white/70">Connecting…</p>
                </div>
              )}

              {/* Show Connecting in PiP position when streams are swapped */}
              {showConnecting && isStreamSwapped && (
                <div
                  className="absolute bg-black/70 flex flex-col items-center justify-center gap-2"
                  style={{
                    bottom: "16px",
                    right: "16px",
                    width: "192px",
                    height: "144px",
                    zIndex: 35,
                    pointerEvents: "none",
                    borderRadius: "12px",
                  }}
                >
                  <div className="w-8 h-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-white/70 text-center px-2">
                    Connecting…
                  </p>
                </div>
              )}

              {/* Remote video - main or PiP based on swap */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleSwapStreams();
                }}
                className="cursor-pointer"
                style={{
                  position: "absolute",
                  ...(isStreamSwapped
                    ? {
                        bottom: "16px",
                        right: "16px",
                        width: "192px",
                        height: "144px",
                        zIndex: 30,
                      }
                    : {
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        zIndex: 1,
                      }),
                }}
              >
                <video
                  ref={strangerVideoDesktopRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover bg-black"
                  style={{
                    display: "block",
                    borderRadius: isStreamSwapped ? "12px" : "0",
                    border: isStreamSwapped
                      ? "2px solid rgba(16, 185, 129, 0.4)"
                      : "none",
                  }}
                  x-webkit-airplay="allow"
                  webkit-playsinline="true"
                  onPlaying={(e) => checkRemoteVideoPlaying(e.currentTarget)}
                  onLoadedData={(e) => checkRemoteVideoPlaying(e.currentTarget)}
                  onTimeUpdate={(e) => checkRemoteVideoPlaying(e.currentTarget)}
                  onPause={() => setRemoteVideoPlaying(false)}
                  onWaiting={() => setRemoteVideoPlaying(false)}
                  onEmptied={() => setRemoteVideoPlaying(false)}
                />
                {/* Label when remote is in PiP */}
                {isStreamSwapped && (
                  <div className="absolute bottom-2 left-2 text-white bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-white/15">
                    <Users size={10} /> {peer?.username ?? "Stranger"}
                  </div>
                )}
              </div>

              {/* Local video - main or PiP based on swap */}
              <div
                onPointerDown={onSelfPointerDown}
                onPointerMove={onSelfPointerMove}
                onPointerUp={onSelfPointerUp}
                onPointerCancel={onSelfPointerUp}
                className="cursor-pointer hover:border-white/30 transition-all"
                style={{
                  touchAction: "none",
                  userSelect: "none",
                  position: "absolute",
                  ...(isStreamSwapped
                    ? {
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        zIndex: 1,
                      }
                    : {
                        bottom: `${16 - selfPos.y}px`,
                        right: `${16 - selfPos.x}px`,
                        width: "192px",
                        height: "144px",
                        zIndex: 30,
                      }),
                }}
              >
                <video
                  ref={selfVideoDesktopRef}
                  autoPlay
                  muted={true}
                  playsInline
                  className="w-full h-full object-cover"
                  style={{
                    display: "block",
                    borderRadius: isStreamSwapped ? "0" : "12px",
                    border: isStreamSwapped
                      ? "none"
                      : "2px solid rgba(16, 185, 129, 0.4)",
                    transform: "scaleX(-1)",
                  }}
                  x-webkit-airplay="allow"
                  webkit-playsinline="true"
                />
                {/* Video off overlay */}
                {!isStreamSwapped && isVideoOff && (
                  <div
                    className="absolute inset-0 bg-black/90 flex items-center justify-center"
                    style={{ borderRadius: "12px" }}
                  >
                    <VideoOff size={32} className="text-white/60" />
                  </div>
                )}
                {isStreamSwapped && isVideoOff && (
                  <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 z-10">
                    <CameraOff size={48} className="text-white/40" />
                    <p className="text-xs text-white/60">Your video is off</p>
                  </div>
                )}
                {/* Loading overlay */}
                {!isStreamSwapped && !localStreamReady && (
                  <div
                    className="absolute inset-0 bg-black/90 flex items-center justify-center"
                    style={{ borderRadius: "12px" }}
                  >
                    <div className="w-8 h-8 border-2 border-white/50 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                {/* Label */}
                {!isStreamSwapped && (
                  <div className="absolute bottom-2 left-2 text-white bg-black/60 backdrop-blur-md px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 border border-white/15">
                    <User size={10} /> You
                  </div>
                )}
              </div>

              {/* Label when remote is in main view */}
              {isFullyConnected && !isStreamSwapped && (
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 border border-white/15 z-20">
                  <Users size={14} />
                  <span>{peer?.username ?? "Stranger"}</span>
                </div>
              )}

              {/* Label when local is in main view */}
              {isStreamSwapped && (
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 border border-white/15 z-20">
                  <User size={14} />
                  <span>You</span>
                </div>
              )}

              {/* Control Bar Overlay on Desktop */}
              <div className="absolute bottom-4 left-4 right-56 flex items-center justify-between z-40">
                <div className="flex items-center gap-3">
                  {/* Action Buttons */}
                  {status === "matched" ? (
                    <button
                      onClick={handleNext}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/30 text-surface-dark hover:bg-white/50 text-white rounded-full transition-all shadow-lg font-medium text-sm"
                    >
                      <RotateCcw size={16} /> Next
                    </button>
                  ) : (
                    <button
                      onClick={handleStart}
                      disabled={status === "searching"}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/30 text-surface-dark hover:bg-white/50 disabled:bg-white/30 text-white rounded-full transition-all shadow-lg font-medium text-sm disabled:opacity-60"
                    >
                      <RotateCcw size={16} />
                      {status === "searching" ? "Searching..." : "Start"}
                    </button>
                  )}
                  <button
                    onClick={handleEnd}
                    className="flex items-center gap-2 px-5 py-2.5 bg-red-500/80 backdrop-blur-md hover:bg-red-600 border border-red-500/40 text-white rounded-full transition-all shadow-lg font-medium text-sm"
                  >
                    <Power size={16} /> End
                  </button>
                  {status === "matched" && peer?.userId && (
                    <button
                      onClick={() => setIsReportOpen(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-black/60 backdrop-blur-md hover:bg-black/80 border border-white/15 text-white rounded-full transition-all shadow-lg font-medium text-sm"
                    >
                      <Flag size={16} /> Report
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Controls */}
                  <button
                    onClick={onToggleMute}
                    className={`p-3 rounded-full transition-all shadow-lg backdrop-blur-md ${
                      isMuted
                        ? "bg-red-500/80"
                        : "bg-black/60 border border-white/15 hover:bg-black/80"
                    }`}
                  >
                    {isMuted ? (
                      <MicOff size={20} className="text-white" />
                    ) : (
                      <Mic size={20} className="text-white" />
                    )}
                  </button>

                  <button
                    onClick={onToggleVideo}
                    className={`p-3 rounded-full transition-all shadow-lg backdrop-blur-md ${
                      isVideoOff
                        ? "bg-red-500/80"
                        : "bg-black/60 border border-white/15 hover:bg-black/80"
                    }`}
                  >
                    {isVideoOff ? (
                      <VideoOff size={20} className="text-white" />
                    ) : (
                      <VideoIcon size={20} className="text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Chat - 3 columns */}
          <div className="col-span-3 h-full overflow-hidden">
            <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-xl flex flex-col h-full w-full overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b border-white/10 bg-black/20">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <MessageCircle size={16} className="text-white/80" />
                  Chat
                </h3>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/20">
                {chatMessages.map((msg) => {
                  // if (msg.system) {
                  //   return (
                  //     <div
                  //       key={msg.id}
                  //       className="text-center text-xs text-white/70 italic select-none"
                  //     >
                  //       {msg.text}
                  //     </div>
                  //   );
                  // }
                  if (msg.system) return null;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.self ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm font-medium ${
                          msg.self
                            ? "bg-white text-surface-dark"
                            : "bg-white/10 text-white/90"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messageEndRef} />
              </div>

              {/* Chat Input */}
              <form
                onSubmit={sendMessage}
                className="p-4 border-t border-white/10 bg-black/20"
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={
                      chatDisabled ? "Not connected" : "Type a message..."
                    }
                    disabled={chatDisabled}
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white placeholder-white/50 focus:border-white/40 focus:outline-none transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={chatDisabled || !inputMessage.trim()}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    <Send size={16} className="text-white" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls - Mobile */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/95 to-transparent overflow-visible pointer-events-none"
        style={{
          zIndex: 100,
          paddingBottom: "16px",
          paddingTop: "24px",
        }}
      >
        {/* More menu popover */}
        {isMoreMenuOpen && (
          <>
            <div
              className="fixed inset-0 pointer-events-auto"
              style={{ zIndex: 101 }}
              onClick={() => setIsMoreMenuOpen(false)}
            />
            <div
              className="absolute bottom-full right-4 mb-3 w-52 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
              style={{ zIndex: 102 }}
            >
              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  setIsChatOpen(!isChatOpen);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors"
              >
                <MessageCircle size={18} />
                <span className="text-sm">Chat</span>
                {chatMessages.length > 0 && !isChatOpen && (
                  <span className="ml-auto w-5 h-5 bg-white rounded-full text-[10px] font-bold flex items-center justify-center text-surface-dark">
                    {chatMessages.filter((m) => !m.system && !m.self).length}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  switchCamera();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 transition-colors"
              >
                <SwitchCamera size={18} />
                <span className="text-sm">Switch Camera</span>
              </button>

              {status === "matched" && peer?.userId && (
                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsReportOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-white/10 transition-colors"
                >
                  <Flag size={18} />
                  <span className="text-sm">Report</span>
                </button>
              )}
            </div>
          </>
        )}

        <div className="flex justify-center items-center gap-3 px-4 pointer-events-auto">
          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isMuted
                ? "bg-red-500/90 backdrop-blur-md"
                : "bg-gray-800/80 backdrop-blur-md hover:bg-gray-700/80 border border-white/10"
            }`}
          >
            {isMuted ? (
              <MicOff size={22} className="text-white" />
            ) : (
              <Mic size={22} className="text-white" />
            )}
          </button>

          {/* Video Toggle Button */}
          <button
            onClick={onToggleVideo}
            className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isVideoOff
                ? "bg-red-500/90 backdrop-blur-md"
                : "bg-gray-800/80 backdrop-blur-md hover:bg-gray-700/80 border border-white/10"
            }`}
          >
            {isVideoOff ? (
              <CameraOff size={20} className="text-white" />
            ) : (
              <Camera size={20} className="text-white" />
            )}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEnd}
            className="w-14 h-14 flex-shrink-0 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg"
          >
            <Power size={24} className="text-white" />
          </button>

          {/* Next/Start Button */}
          {status === "matched" ? (
            <button
              onClick={handleNext}
              className="w-12 h-12 flex-shrink-0 rounded-full bg-white/30 text-surface-dark hover:bg-white/50 text-white transition-all shadow-lg flex items-center justify-center"
            >
              <RotateCcw size={20} />
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={status === "searching"}
              className="w-12 h-12 flex-shrink-0 rounded-full bg-white/30 text-surface-dark hover:bg-white/50 disabled:bg-white/30 text-white transition-all shadow-lg flex items-center justify-center disabled:opacity-60"
            >
              <RotateCcw size={20} />
            </button>
          )}

          {/* More Menu Toggle */}
          <button
            onClick={() => setIsMoreMenuOpen((v) => !v)}
            className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center transition-all shadow-lg relative ${
              isMoreMenuOpen
                ? "bg-white/20 border border-white/30"
                : "bg-gray-800/80 backdrop-blur-md hover:bg-gray-700/80 border border-white/10"
            }`}
          >
            <MoreVertical size={20} className="text-white" />
            {chatMessages.length > 0 && !isChatOpen && !isMoreMenuOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full text-[9px] font-bold flex items-center justify-center text-surface-dark">
                {chatMessages.filter((m) => !m.system && !m.self).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Chat Overlay */}
      {isChatOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm "
          onClick={() => setIsChatOpen(false)}
        >
          <div
            className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900 to-slate-800 rounded-t-3xl border-t border-white/10 shadow-2xl max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageCircle size={20} className="text-white/80" />
                Chat
              </h3>
              <button
                onClick={() => setIsChatOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition"
              >
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ||
                (chatMessages[chatMessages.length - 1].system && (
                  <div className="text-center text-sm text-white/70 italic select-none">
                    Connect to start chatting!
                  </div>
                ))}
              {chatMessages.length > 0 &&
                chatMessages.map((msg) => {
                  // if (msg.system) {
                  //   return (
                  //     <div
                  //       key={msg.id}
                  //       className="text-center text-xs text-white/70 italic select-none"
                  //     >
                  //       {msg.text}
                  //     </div>
                  //   );
                  // }

                  if (msg.system) return null;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.self ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2.5 rounded-md text-sm font-medium ${
                          msg.self
                            ? "bg-white text-surface-dark"
                            : "bg-white/10 text-white/90"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              <div ref={messageEndRef} />
            </div>

            {/* Chat Input */}
            <form
              onSubmit={sendMessage}
              className="p-4 border-t border-white/10 bg-black/20"
            >
              <div className="flex gap-2 mb-18">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={
                    chatDisabled ? "Not connected" : "Type a message..."
                  }
                  disabled={chatDisabled}
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:border-white/40 focus:outline-none transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={chatDisabled || !inputMessage.trim()}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  <Send size={18} className="text-white" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Desktop Chat Sidebar - Now moved to right side */}
      <div className="hidden md:block">
        {/* Chat is in sidebar - see above */}
      </div>

      {/* Hidden old desktop panel - replaced by new layout */}
      <div className="hidden">
        {/* Chat */}
        <div className="w-full">
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10 shadow-xl">
            <div className="h-64 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/20">
              {chatMessages.map((msg) => {
                // if (msg.system) {
                //   return (
                //     <div
                //       key={msg.id}
                //       className="text-center text-xs text-white/70 italic select-none"
                //     >
                //       {msg.text}
                //     </div>
                //   );
                // }
                if (msg.system) return null;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.self ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-medium ${
                        msg.self
                          ? "bg-white text-surface-dark"
                          : "bg-white/10 text-white/90"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>

            <form onSubmit={sendMessage} className="mt-4 flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  chatDisabled ? "Not connected" : "Send a message..."
                }
                disabled={chatDisabled}
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:border-white/40 focus:outline-none transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={chatDisabled || !inputMessage.trim()}
                className="p-3 bg-white text-surface-dark hover:bg-white/90 rounded-xl hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                <Send size={18} className="text-white" />
              </button>
            </form>
          </div>
        </div>

        {/* Right panel */}
        <div className="p-4 space-y-6">
          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={handleEnd}
              className="flex items-center gap-2 px-8 py-3 bg-red-500/20 border border-red-500/40 text-red-400 rounded-full hover:bg-red-500/30 transition-all shadow-lg font-medium"
            >
              <Power size={20} /> End
            </button>

            {status === "matched" ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 bg-white/30 text-surface-dark hover:bg-white/50 text-white rounded-full transition-all shadow-lg font-medium"
              >
                <RotateCcw size={20} /> Next
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={status === "searching"}
                className="flex items-center gap-2 px-8 py-3 bg-white/30 text-surface-dark hover:bg-white/50 disabled:bg-white/30 text-white rounded-full transition-all shadow-lg font-medium disabled:opacity-60"
              >
                <RotateCcw size={20} />
                {status === "searching" ? "Searching..." : "Start"}
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="flex justify-center items-center gap-6">
            <button
              onClick={onToggleMute}
              className={`p-5 rounded-full transition-all shadow-lg backdrop-blur-md ${
                isMuted
                  ? "bg-red-500/80"
                  : "bg-white/10 border border-white/15 hover:bg-white/20"
              }`}
            >
              {isMuted ? (
                <MicOff size={24} className="text-white" />
              ) : (
                <Mic size={24} className="text-white" />
              )}
            </button>

            <button
              onClick={onToggleVideo}
              className={`p-5 rounded-full transition-all shadow-lg backdrop-blur-md ${
                isVideoOff
                  ? "bg-red-500/80"
                  : "bg-white/10 border border-white/15 hover:bg-white/20"
              }`}
            >
              {isVideoOff ? (
                <VideoOff size={24} className="text-white" />
              ) : (
                <VideoIcon size={24} className="text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
