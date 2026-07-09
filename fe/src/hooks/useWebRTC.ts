import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

type UseWebRTCArgs = {
  socket: Socket | null;
  roomId: string | null;
  selfUserId: string;
  offererHint?: string | null;
  localStreamRef: React.MutableRefObject<MediaStream | null>;
};

type UseWebRTCResult = {
  attachLocal: (el: HTMLVideoElement | null) => void;
  attachRemote: (el: HTMLVideoElement | null) => void;
  toggleAudio: (on?: boolean) => void;
  toggleVideo: (on?: boolean) => void;
  cleanupRemote: () => void;
  endCall: () => void;
  replaceVideoTrack: (track: MediaStreamTrack) => Promise<void>;
  connected: boolean;
};

function buildIceServers(): RTCIceServer[] {
  return [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ];
}

// CRITICAL: Mobile-safe video player
function playVideoSafely(
  video: HTMLVideoElement,
  streamType: "local" | "remote"
) {
  if (!video.srcObject) {
    console.warn(`[WebRTC] No srcObject for ${streamType} video`);
    return;
  }

  // console.log(`[WebRTC] Attempting to play ${streamType} video`);

  // NOTE: no video.load() here — srcObject updates the element on its own,
  // and calling load() while a play() from another call site is still
  // pending is what triggers "AbortError: play() interrupted by new load".

  const playPromise = video.play();

  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        // console.log(`[WebRTC] ✅ ${streamType} video playing`);
      })
      .catch((error) => {
        // Benign: a later playVideoSafely() call for the same element
        // superseded this one before it resolved. Nothing to retry.
        if (error.name === "AbortError") return;

        console.warn(
          `[WebRTC] ${streamType} video autoplay blocked:`,
          error.message
        );

        // iOS/Safari fix: Wait for user interaction
        const playOnInteraction = () => {
          // console.log  (
          //     `[WebRTC] Retrying ${streamType} video play on user interaction`
          //   );
          video.play().catch((retryError) => {
            console.error(
              `[WebRTC] Retry failed for ${streamType}:`,
              retryError
            );
          });

          // Remove listeners after first attempt
          document.removeEventListener("touchstart", playOnInteraction);
          document.removeEventListener("touchend", playOnInteraction);
          document.removeEventListener("click", playOnInteraction);
        };

        // Listen for ANY user interaction
        document.addEventListener("touchstart", playOnInteraction, {
          once: true,
          passive: true,
        });
        document.addEventListener("touchend", playOnInteraction, {
          once: true,
          passive: true,
        });
        document.addEventListener("click", playOnInteraction, { once: true });

        // console.log(
        //   `[WebRTC] 📱 Waiting for user tap to play ${streamType} video...`
        // );
      });
  }
}

export function useWebRTC({
  socket,
  roomId,
  selfUserId,
  localStreamRef,
}: UseWebRTCArgs): UseWebRTCResult {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localElRef = useRef<HTMLVideoElement | null>(null);
  const remoteElRef = useRef<HTMLVideoElement | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const politeRef = useRef(false);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!socket || !roomId) {
      // console.log("[WebRTC] Skipping init: missing socket or roomId");
      return;
    }

    // console.log(`[WebRTC] Initializing for room ${roomId}, user ${selfUserId}`);
    let closed = false;

    const pc = new RTCPeerConnection({ iceServers: buildIceServers() });
    pcRef.current = pc;

    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      // console.log(`[WebRTC] Connection state: ${st}`);
      setConnected(st === "connected");

      if (st === "failed") {
        console.warn("[WebRTC] Connection failed, attempting restart...");
        pc.restartIce?.();
      }
    };

    pc.oniceconnectionstatechange = () => {
      // console.log(`[WebRTC] ICE connection state: ${pc.iceConnectionState}`);
    };

    pc.onsignalingstatechange = () => {
      // console.log(`[WebRTC] Signaling state: ${pc.signalingState}`);
    };

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) {
        // console.log("[WebRTC] ICE gathering complete");
        return;
      }
      // console.log("[WebRTC] Sending ICE candidate");
      socket.emit("rtc:candidate", {
        roomId,
        candidate: ev.candidate.toJSON(),
      });
    };

    // ✅ MOBILE FIX: Improved track handler with aggressive retries
    pc.ontrack = (ev) => {
      // console.log("[WebRTC] 🎥 ontrack fired", {
      //   trackKind: ev.track.kind,
      //   trackId: ev.track.id,
      //   streamsCount: ev.streams.length,
      //   trackReadyState: ev.track.readyState,
      //   trackEnabled: ev.track.enabled,
      // });

      const stream = ev.streams[0] || new MediaStream([ev.track]);
      remoteStreamRef.current = stream;

      // console.log("[WebRTC] Remote stream details:", {
      //   id: stream.id,
      //   active: stream.active,
      //   videoTracks: stream.getVideoTracks().length,
      //   audioTracks: stream.getAudioTracks().length,
      // });

      // ✅ CRITICAL: Attach stream immediately if element exists
      if (remoteElRef.current) {
        // console.log("[WebRTC] Attaching remote stream to video element");
        remoteElRef.current.srcObject = stream;

        // Force video element attributes (mobile needs these AFTER srcObject)
        remoteElRef.current.playsInline = true;
        remoteElRef.current.autoplay = true;
        remoteElRef.current.muted = false; // Remote should have audio

        // Wait a tick for browser to process srcObject
        setTimeout(() => {
          if (remoteElRef.current) {
            playVideoSafely(remoteElRef.current, "remote");
          }
        }, 100);

        // Mobile Safari fix: Retry on loadedmetadata
        remoteElRef.current.addEventListener(
          "loadedmetadata",
          () => {
            // console.log("[WebRTC] Remote video metadata loaded");
            if (remoteElRef.current) {
              playVideoSafely(remoteElRef.current, "remote");
            }
          },
          { once: true }
        );
      } else {
        console.warn("[WebRTC] ⚠️ Remote video element not mounted yet!");
      }
    };

    // Check for existing local stream
    let mediaReady = !!localStreamRef.current;

    if (mediaReady) {
      // console.log("[WebRTC] ✅ Reusing existing local stream");

      localStreamRef.current!.getTracks().forEach((track) => {
        //  console.log(`[WebRTC] Adding ${track.kind} track to peer connection`);
        pc.addTrack(track, localStreamRef.current!);
      });

      socket.emit("room:join", { roomId });
    } else {
      // console.log("[WebRTC] Requesting user media...");

      (async () => {
        try {
          // ✅ MOBILE-OPTIMIZED CONSTRAINTS
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              facingMode: "user",
              frameRate: { ideal: 30, max: 30 }, // Limit frame rate for mobile
            },
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          if (closed) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }

          // console.log("[WebRTC] ✅ Got local stream", {
          //   videoTracks: stream.getVideoTracks().length,
          //   audioTracks: stream.getAudioTracks().length,
          //   videoSettings: stream.getVideoTracks()[0]?.getSettings(),
          // });

          localStreamRef.current = stream;

          // Attach to video element if it exists
          if (localElRef.current) {
            localElRef.current.srcObject = stream;
            localElRef.current.muted = true; // MUST be muted for autoplay
            localElRef.current.playsInline = true;
            localElRef.current.autoplay = true;

            setTimeout(() => {
              if (localElRef.current) {
                playVideoSafely(localElRef.current, "local");
              }
            }, 100);
          }

          stream.getTracks().forEach((track) => {
            //  console.log (
            //     `[WebRTC] Adding ${track.kind} track to peer connection`
            //   );
            pc.addTrack(track, stream);
          });

          mediaReady = true;
          socket.emit("room:join", { roomId });
        } catch (e) {
          console.error("[WebRTC] getUserMedia failed:", e);
          socket.emit("room:join", { roomId });
        }
      })();
    }

    // Signaling handlers (keep existing logic)
    // In useWebRTC hook, MODIFY the onReady handler:

    const onReady = (payload: { roomId: string; offerer: string }) => {
      if (payload.roomId !== roomId) return;
      console.log(
        `[WebRTC] rtc:ready. Offerer: ${payload.offerer}, Self: ${selfUserId}`
      );
      politeRef.current = payload.offerer !== selfUserId;

      // ONLY the offerer should create the offer
      if (payload.offerer === selfUserId) {
        console.log("[WebRTC] I am the offerer, creating offer...");

        (async () => {
          if (!pcRef.current) return;

          // Wait for media to be ready
          let attempts = 0;
          while (!mediaReady && attempts < 50) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            attempts++;
          }

          if (!mediaReady) {
            console.warn(
              "[WebRTC] Media not ready after 5s, proceeding anyway"
            );
          }

          try {
            makingOfferRef.current = true;
            const offer = await pcRef.current.createOffer({
              offerToReceiveAudio: true, // ✅ ADD THESE
              offerToReceiveVideo: true,
            });
            await pcRef.current.setLocalDescription(offer);

            console.log("[WebRTC] Sending offer");
            socket.emit("rtc:offer", {
              roomId,
              sdp: pcRef.current.localDescription,
            });
          } catch (err) {
            console.error("[WebRTC] createOffer failed:", err);
          } finally {
            makingOfferRef.current = false;
          }
        })();
      } else {
        console.log("[WebRTC] I am NOT the offerer, waiting for offer...");
      }
    };

    const onOffer = async (payload: {
      roomId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (payload.roomId !== roomId || !pcRef.current) return;

      let attempts = 0;
      while (!mediaReady && attempts < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      const pcNow = pcRef.current;
      const offerCollision =
        makingOfferRef.current || pcNow.signalingState !== "stable";
      ignoreOfferRef.current = !politeRef.current && offerCollision;

      if (ignoreOfferRef.current) return;

      try {
        if (offerCollision && politeRef.current) {
          await pcNow.setLocalDescription({ type: "rollback" });
        }

        await pcNow.setRemoteDescription(
          new RTCSessionDescription(payload.sdp)
        );
        const answer = await pcNow.createAnswer();
        await pcNow.setLocalDescription(answer);
        socket.emit("rtc:answer", { roomId, sdp: pcNow.localDescription });
      } catch (err) {
        console.error("[WebRTC] onOffer failed:", err);
      }
    };

    const onAnswer = async (payload: {
      roomId: string;
      sdp: RTCSessionDescriptionInit;
    }) => {
      if (payload.roomId !== roomId || !pcRef.current) return;
      try {
        await pcRef.current.setRemoteDescription(
          new RTCSessionDescription(payload.sdp)
        );
      } catch (err) {
        console.error("[WebRTC] onAnswer failed:", err);
      }
    };

    const onCandidate = async (payload: {
      roomId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (payload.roomId !== roomId || !pcRef.current) return;
      try {
        await pcRef.current.addIceCandidate(
          new RTCIceCandidate(payload.candidate)
        );
      } catch (err) {
        if (!ignoreOfferRef.current) {
          console.warn("[WebRTC] addIceCandidate failed:", err);
        }
      }
    };

    const onPeerLeft = () => {
      // console.log("[WebRTC] Peer left");
      setConnected(false);

      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((track) => track.stop());
        remoteStreamRef.current = null;
      }

      if (remoteElRef.current) {
        remoteElRef.current.srcObject = null;
      }
    };

    socket.on("rtc:ready", onReady);
    socket.on("rtc:offer", onOffer);
    socket.on("rtc:answer", onAnswer);
    socket.on("rtc:candidate", onCandidate);
    socket.on("rtc:peer-left", onPeerLeft);

    return () => {
      closed = true;
      socket.off("rtc:ready", onReady);
      socket.off("rtc:offer", onOffer);
      socket.off("rtc:answer", onAnswer);
      socket.off("rtc:candidate", onCandidate);
      socket.off("rtc:peer-left", onPeerLeft);

      try {
        pc.close();
      } catch {}
      pcRef.current = null;

      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((track) => track.stop());
        remoteStreamRef.current = null;
      }

      if (remoteElRef.current) remoteElRef.current.srcObject = null;

      makingOfferRef.current = false;
      ignoreOfferRef.current = false;
      politeRef.current = false;
      setConnected(false);
    };
  }, [socket, roomId, selfUserId, localStreamRef]);

  // ✅ MOBILE FIX: Aggressive attachment with retries
  const attachLocal = useCallback(
    (el: HTMLVideoElement | null) => {
      // console.log("[WebRTC] attachLocal called", {
      //   hasElement: !!el,
      //   hasStream: !!localStreamRef.current,
      // });
      localElRef.current = el;

      if (el && localStreamRef.current) {
        el.srcObject = localStreamRef.current;
        el.muted = true;
        el.playsInline = true;
        el.autoplay = true;

        // Force explicit size
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.objectFit = "cover";

        setTimeout(() => {
          if (el) playVideoSafely(el, "local");
        }, 100);
      }
    },
    [localStreamRef]
  );

  const attachRemote = useCallback((el: HTMLVideoElement | null) => {
    // console.log("[WebRTC] attachRemote called", {
    //   hasElement: !!el,
    //   hasStream: !!remoteStreamRef.current,
    // });
    remoteElRef.current = el;

    if (el) {
      // Set attributes BEFORE checking stream
      el.playsInline = true;
      el.autoplay = true;
      el.muted = false;

      // Force explicit size
      el.style.width = "100%";
      el.style.height = "100%";
      el.style.objectFit = "cover";

      if (remoteStreamRef.current) {
        // console.log("[WebRTC] Attaching existing remote stream");
        el.srcObject = remoteStreamRef.current;
        setTimeout(() => {
          if (el) playVideoSafely(el, "remote");
        }, 100);
        return;
      }

      // Check for tracks in peer connection
      if (pcRef.current) {
        const receivers = pcRef.current.getReceivers();
        const tracks = receivers.map((r) => r.track).filter(Boolean);

        if (tracks.length > 0) {
          // console.log("[WebRTC] Creating stream from existing tracks");
          const stream = new MediaStream(tracks);
          remoteStreamRef.current = stream;
          el.srcObject = stream;
          setTimeout(() => {
            if (el) playVideoSafely(el, "remote");
          }, 100);
        }
      }
    }
  }, []);

  const cleanupRemote = useCallback(() => {
    // console.log("[WebRTC] 🧹 Cleaning up REMOTE only");

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      remoteStreamRef.current = null;
    }

    if (remoteElRef.current) {
      remoteElRef.current.srcObject = null;
    }

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }

    setConnected(false);
    //  console.log (
    //     "[WebRTC] ✅ Local stream preserved:",
    //     !!localStreamRef.current
    //   );
  }, [localStreamRef]);

  const replaceVideoTrack = useCallback(async (newTrack: MediaStreamTrack) => {
    const pc = pcRef.current;
    if (!pc) {
      console.warn("[WebRTC] replaceVideoTrack: no PeerConnection");
      return;
    }

    const sender = pc
      .getSenders()
      .find((s) => s.track && s.track.kind === "video");

    if (!sender) {
      console.warn("[WebRTC] replaceVideoTrack: no video sender found");
      return;
    }

    try {
      await sender.replaceTrack(newTrack);
      // console.log("[WebRTC] 🎥 Outgoing video track replaced");
    } catch (err) {
      console.error("[WebRTC] replaceTrack failed:", err);
    }
  }, []);

  const toggleAudio = useCallback(
    (on?: boolean) => {
      const s = localStreamRef.current;
      if (!s) return;
      s.getAudioTracks().forEach((t) => {
        t.enabled = on ?? !t.enabled;
      });
    },
    [localStreamRef]
  );

  const toggleVideo = useCallback(
    (on?: boolean) => {
      const s = localStreamRef.current;
      if (!s) return;
      s.getVideoTracks().forEach((t) => {
        t.enabled = on ?? !t.enabled;
      });
    },
    [localStreamRef]
  );

  const endCall = useCallback(() => {
    // console.log("[WebRTC] ⚠️ Full teardown");

    if (socket && roomId) socket.emit("rtc:leave", { roomId });

    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (remoteElRef.current) remoteElRef.current.srcObject = null;
    if (localElRef.current) localElRef.current.srcObject = null;

    setConnected(false);
  }, [roomId, socket, localStreamRef]);

  return {
    attachLocal,
    attachRemote,
    toggleAudio,
    toggleVideo,
    cleanupRemote,
    replaceVideoTrack,
    endCall,
    connected,
  };
}
