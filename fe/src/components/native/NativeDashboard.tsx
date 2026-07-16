"use client";

import { useGetUser } from "@/hooks/use-getuser";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import {
  Video,
  Shuffle,
  Mars,
  Venus,
  Flame,
  Wifi,
  Shield,
  Mic,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import NMBadge from "@/components/custom/NMBadge";
import PulseLoader from "@/components/custom/Loader";
import { platform } from "@/platform";
import { cn } from "@/lib/utils";

type MatchPref = "RANDOM" | "MALE" | "FEMALE";

const PREF_OPTIONS = [
  { value: "RANDOM" as MatchPref, label: "Anyone",  Icon: Shuffle },
  { value: "MALE"   as MatchPref, label: "Male",    Icon: Mars    },
  { value: "FEMALE" as MatchPref, label: "Female",  Icon: Venus   },
];

const SAFETY_TIPS = [
  {
    Icon: Wifi,
    title: "Stable connection",
    body: "Use Wi-Fi or strong 4G/5G. Close heavy apps. Avoid VPNs.",
  },
  {
    Icon: Mic,
    title: "Grant camera & mic",
    body: "Allow permissions and keep other video apps closed.",
  },
  {
    Icon: Shield,
    title: "Stay respectful",
    body: "Don't share personal info. Report suspicious behaviour immediately.",
  },
  {
    Icon: AlertTriangle,
    title: "No explicit content",
    body: "Sexual or adult content is strictly prohibited and may lead to a ban.",
  },
];

/**
 * Native Android dashboard — replaces the web Dashboard.tsx for native builds.
 * Designed from scratch with Material-You-inspired card surfaces, large touch
 * targets, and bottom-sheet visual language instead of desktop-style grids.
 */
export default function NativeDashboard() {
  const { data: session, status } = useSession();
  const user = useGetUser();
  const router = useRouter();
  const [matchPref, setMatchPref] = useState<MatchPref>("RANDOM");
  const [greeting, setGreeting] = useState("Hello");
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12)      setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else             setGreeting("Good evening");
  }, []);

  const handleStart = () => {
    router.push(`/chat?pref=${matchPref.toLowerCase()}`);
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <PulseLoader />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-muted-foreground">
        Please sign in to access your dashboard.
      </div>
    );
  }

  const firstName = (user?.name ?? user?.email ?? "there").split(" ")[0];

  return (
    <div className="min-h-full bg-background pb-6">
      {/* ── Hero Header ───────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden bg-signature-forest px-5 pb-10 pt-6"
        style={{ borderRadius: "0 0 32px 32px" }}
      >
        {/* Subtle texture rings */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 rounded-full bg-white/5" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/60">{greeting},</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-white">
              {firstName} 👋
            </h1>
          </div>

          <button
            id="dashboard-avatar-btn"
            aria-label="Go to profile"
            onClick={() => router.push("/settings")}
            className="active:scale-90 transition-transform"
          >
            <Avatar className="h-12 w-12 border-2 border-white/20 shadow-md">
              <AvatarImage src={user?.image ?? ""} />
              <AvatarFallback className="bg-white/20 text-white text-lg font-semibold">
                {(user?.name ?? "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>

        {/* Inline XP/streak pill */}
        <div className="mt-5 inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-white">
            <Flame size={15} className="text-orange-400" />
            Streak active
          </span>
          <div className="h-3 w-px bg-white/20" />
          <span className="flex items-center gap-1.5 text-sm font-medium text-white">
            <Sparkles size={14} className="text-yellow-300" />
            Keep it up!
          </span>
        </div>
      </div>

      <div className="px-4 pt-6 space-y-4">
        {/* ── Match Preference Chips ─────────────────────────────────── */}
        <div className="space-y-2">
          <p className="px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Match with
          </p>
          <div className="flex gap-2">
            {PREF_OPTIONS.map(({ value, label, Icon }) => {
              const active = matchPref === value;
              return (
                <button
                  key={value}
                  id={`pref-${value.toLowerCase()}`}
                  onClick={() => setMatchPref(value)}
                  aria-pressed={active}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 rounded-2xl py-3.5 px-2",
                    "border transition-all duration-200 active:scale-95",
                    active
                      ? "border-signature-forest bg-signature-forest text-white shadow-lg shadow-signature-forest/20"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                  <span className="text-xs font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Big Start CTA ─────────────────────────────────────────── */}
        <button
          id="start-chat-btn"
          onClick={handleStart}
          className="
            w-full flex items-center justify-center gap-3
            bg-signature-forest text-white
            rounded-2xl py-5 text-lg font-bold tracking-tight
            shadow-xl shadow-signature-forest/30
            active:scale-[0.97] active:shadow-md
            transition-all duration-150
          "
        >
          <Video size={24} strokeWidth={2.2} />
          Start Video Chat
        </button>

        {/* ── Progress (NM Badge + Heatmap) ─────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Your Progress</p>
            <Flame size={16} className="text-orange-400" />
          </div>
          <NMBadge />
        </div>

        {/* ── Safety Tips (collapsible) ──────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <button
            id="safety-tips-toggle"
            onClick={() => setShowTips((s) => !s)}
            className="
              w-full flex items-center justify-between px-4 py-4
              active:bg-muted transition-colors
            "
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Shield size={16} className="text-signature-forest" />
              Before you start
            </span>
            <ChevronRight
              size={16}
              className={cn(
                "text-muted-foreground transition-transform duration-200",
                showTips && "rotate-90",
              )}
            />
          </button>

          {showTips && (
            <div className="border-t border-border divide-y divide-border">
              {SAFETY_TIPS.map(({ Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3 px-4 py-3.5">
                  <div className="mt-0.5 rounded-lg bg-muted p-2 shrink-0">
                    <Icon size={15} className="text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {body}
                    </p>
                  </div>
                </div>
              ))}

              <div className="px-4 py-3 bg-muted/50">
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  💡 If video is black on mobile, toggle mute once, then re-enter.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
