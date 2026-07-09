"use client";

import { useGetUser } from "@/hooks/use-getuser";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Video,
  Sparkles,
  Zap,
  Shuffle,
  Mars,
  Venus,
  AlertTriangle,
  Shield,
  Mic,
  Wifi,
} from "lucide-react";
import Header from "./Header";
import { useRouter } from "next/navigation";
import PulseLoader from "./Loader";
import NMBadge from "./NMBadge";

type MatchPref = "RANDOM" | "MALE" | "FEMALE";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const _user = useGetUser();

  const [_stats] = useState({
    strangersConnected: 47,
    timeSpent: "3h 24m",
    likesReceived: 12,
  });

  const [_currentTime, setCurrentTime] = useState("");
  const [matchPref, setMatchPref] = useState<MatchPref>("RANDOM");

  // Live IST Time
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }) + " IST"
      );
    };
    update();
    const int = setInterval(update, 1000);
    return () => clearInterval(int);
  }, []);

  const router = useRouter();

  const handleStart = (e?: React.MouseEvent) => {
    e?.preventDefault();
    router.push(`/chat?pref=${matchPref.toLowerCase()}`); // send selected preference
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <PulseLoader />
        <span className="sr-only">Loading your dashboard...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-body text-lg">
          Please sign in to access your dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard Header */}
      <Header />

      {/* Main Dashboard Grid */}
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col-reverse lg:flex-row gap-8 mt-15">
          {/* Tips Card */}
          <div className="bg-card rounded-lg p-5 sm:p-8 border border-border flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-md border border-border">
                  <Sparkles size={20} className="text-signature-coral" />
                </div>
                <h2 className="text-lg md:text-xl font-medium tracking-tight text-foreground">
                  Before You Start a Call
                </h2>
              </div>
            </div>

            {/* subtle note */}
            <p className="text-body text-xs md:text-sm mb-5 leading-relaxed">
              Follow these to keep the experience smooth & safe.
            </p>

            {/* tips grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tip 1 */}
              <div className="flex items-start gap-3 rounded-md border border-border p-4">
                <Wifi className="mt-0.5 shrink-0 text-muted-foreground" size={18} />
                <div>
                  <p className="text-foreground font-medium text-sm">
                    Prefer stable internet
                  </p>
                  <p className="text-body text-xs mt-1">
                    Use Wi-Fi or strong 4G/5G. Close heavy apps. Avoid VPNs.
                  </p>
                </div>
              </div>

              {/* Tip 2 */}
              <div className="flex items-start gap-3 rounded-md border border-border p-4">
                <Mic className="mt-0.5 shrink-0 text-muted-foreground" size={18} />
                <div>
                  <p className="text-foreground font-medium text-sm">
                    Grant camera & mic
                  </p>
                  <p className="text-body text-xs mt-1">
                    Allow permissions and keep other video apps closed to avoid
                    device lock.
                  </p>
                </div>
              </div>

              {/* Tip 3 */}
              <div className="flex items-start gap-3 rounded-md border border-border p-4">
                <Shield className="mt-0.5 shrink-0 text-muted-foreground" size={18} />
                <div>
                  <p className="text-foreground font-medium text-sm">
                    Stay safe & respectful
                  </p>
                  <p className="text-body text-xs mt-1">
                    Don’t share personal info. Avoid using offensive language,
                    bullying, or any kind of inappropriate behavior during video
                    chats. Report suspicious behavior immediately.
                  </p>
                </div>
              </div>

              {/* Tip 4 – No Explicit or Sexual Content */}
              <div className="flex items-start gap-3 rounded-md border border-border p-4">
                <AlertTriangle className="mt-0.5 shrink-0 text-muted-foreground" size={18} />
                <div>
                  <p className="text-foreground font-medium text-sm">
                    No explicit content
                  </p>
                  <p className="text-body text-xs mt-1">
                    Sharing or engaging in sexual, obscene, or adult content is
                    strictly prohibited and may lead to an instant ban.
                  </p>
                </div>
              </div>
            </div>

            {/* foot helper */}
            <div className="mt-5 rounded-md bg-muted p-3 border border-border">
              <p className="text-[11px] md:text-xs text-body">
                Pro tip: If video is black on mobile, try toggling mute/unmute
                once, and re-enter the room. Some mobile browsers only start
                playback after a user gesture.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card rounded-lg p-5 sm:p-8 border border-border flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-medium text-foreground">
                Quick Actions
              </h2>
              <Zap size={22} className="text-signature-coral" />
            </div>

            <div className="space-y-6">
              <Link
                href=""
                className="group w-full text-center py-4 bg-primary text-primary-foreground font-medium text-md rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-3"
                onClick={handleStart}
              >
                <Video
                  size={22}
                  className="hidden sm:block"
                />
                Start Video Chat Now
              </Link>

              {/* Match Preference (Segmented Control) */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Match Preference
                </label>

                <div className="mt-3 p-1 bg-muted rounded-lg border border-border flex items-center gap-1 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMatchPref("RANDOM")}
                    className={[
                      "flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors",
                      matchPref === "RANDOM"
                        ? "bg-primary text-primary-foreground"
                        : "text-body hover:bg-accent",
                    ].join(" ")}
                    aria-pressed={matchPref === "RANDOM"}
                  >
                    <Shuffle size={16} />
                    Random
                  </button>

                  <button
                    type="button"
                    onClick={() => setMatchPref("MALE")}
                    className={[
                      "flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors",
                      matchPref === "MALE"
                        ? "bg-primary text-primary-foreground"
                        : "text-body hover:bg-accent",
                    ].join(" ")}
                    aria-pressed={matchPref === "MALE"}
                  >
                    <Mars size={16} />
                    Male
                  </button>

                  <button
                    type="button"
                    onClick={() => setMatchPref("FEMALE")}
                    className={[
                      "flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-colors",
                      matchPref === "FEMALE"
                        ? "bg-primary text-primary-foreground"
                        : "text-body hover:bg-accent",
                    ].join(" ")}
                    aria-pressed={matchPref === "FEMALE"}
                  >
                    <Venus size={16} />
                    Female
                  </button>
                </div>

                {/* Context text */}
                <p className="mt-2 text-[11px] text-muted-foreground">
                  We’ll try to match you based on this preference. Availability
                  may affect results.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-8 bg-card rounded-lg p-5 sm:p-8 border border-border">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-medium text-foreground">Your Progress</h2>
            <Zap size={22} className="text-signature-coral" />
          </div>

          <NMBadge />
        </div>
      </main>
    </div>
  );
}
