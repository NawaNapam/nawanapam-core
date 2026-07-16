"use client";

import { useEffect, useState } from "react";
import { History, Flag, Copy, Check, Video, Clock, User } from "lucide-react";
import { toast } from "@/services/toast";
import PulseLoader from "@/components/custom/Loader";
import { cn } from "@/lib/utils";

const REPORT_FORM_URL = process.env.NEXT_PUBLIC_CALL_REPORT_FORM_URL || "";

type CallHistoryEntry = {
  id: string;
  roomId: string;
  peerId: string | null;
  peerUsername: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  createdAt: string;
};

function formatDuration(sec: number | null) {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Group calls by relative date label
function groupByDate(calls: CallHistoryEntry[]) {
  const groups: Record<string, CallHistoryEntry[]> = {};
  for (const call of calls) {
    const label = formatDate(call.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(call);
  }
  return groups;
}

/**
 * Native-styled call history page — matches the NativeDashboard / NativeSettings
 * design language: green hero header, rounded cards, section group headers.
 */
export default function NativeCallHistory() {
  const [calls, setCalls] = useState<CallHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/call-history");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled) setCalls(data.calls ?? []);
      } catch {
        if (!cancelled) toast.error("Could not load your call history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCopy = async (call: CallHistoryEntry) => {
    const details = [
      `Call ID: ${call.roomId}`,
      `Date: ${new Date(call.createdAt).toLocaleString()}`,
      call.peerUsername ? `Other participant: ${call.peerUsername}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(details);
      setCopiedId(call.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Could not copy details.");
    }
  };

  const handleReport = (call: CallHistoryEntry) => {
    if (!REPORT_FORM_URL) {
      toast.error("Report form isn't configured yet.");
      return;
    }
    handleCopy(call);
    window.open(REPORT_FORM_URL, "_blank", "noopener,noreferrer");
  };

  const grouped = groupByDate(calls);
  const dateGroups = Object.keys(grouped);

  return (
    <div className="min-h-full bg-background pb-6">
      {/* ── Hero Header ───────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden bg-signature-forest px-5 pb-8 pt-6"
        style={{ borderRadius: "0 0 32px 32px" }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/60">
              {calls.length > 0 ? `${calls.length} calls` : "Your calls"}
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <History size={22} />
              Call History
            </h1>
          </div>

          <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
            <Video size={22} className="text-white" />
          </div>
        </div>

        {/* Stats pills */}
        {!loading && calls.length > 0 && (
          <div className="mt-5 flex gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
              <Video size={13} className="text-white/80" />
              <span className="text-xs font-medium text-white">
                {calls.length} total
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
              <Clock size={13} className="text-white/80" />
              <span className="text-xs font-medium text-white">
                {Math.round(
                  calls.reduce((s, c) => s + (c.durationSec ?? 0), 0) / 60,
                )}
                m total
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 pt-5">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <PulseLoader />
          </div>
        )}

        {/* Empty state */}
        {!loading && calls.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-muted p-5">
              <Video size={28} className="text-muted-foreground" />
            </div>
            <p className="text-base font-semibold text-foreground">No calls yet</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-[240px]">
              Start a video chat from the Home tab to see your history here.
            </p>
          </div>
        )}

        {/* Grouped call list */}
        {!loading && dateGroups.length > 0 && (
          <div className="space-y-5">
            {dateGroups.map((dateLabel) => (
              <div key={dateLabel}>
                {/* Section header */}
                <p className="px-1 mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {dateLabel}
                </p>

                <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
                  {grouped[dateLabel].map((call) => {
                    const duration = formatDuration(call.durationSec);
                    const time = formatTime(call.createdAt);
                    const isCopied = copiedId === call.id;

                    return (
                      <div key={call.id} className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar placeholder */}
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <User size={18} className="text-muted-foreground" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">
                              {call.peerUsername ?? "Anonymous Stranger"}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">{time}</span>
                              {duration && (
                                <>
                                  <span className="text-muted-foreground/40 text-xs">·</span>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock size={10} />
                                    {duration}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              id={`copy-call-${call.id}`}
                              onClick={() => handleCopy(call)}
                              className={cn(
                                "h-9 w-9 rounded-full flex items-center justify-center transition-all active:scale-90",
                                isCopied
                                  ? "bg-signature-forest/10"
                                  : "bg-muted",
                              )}
                              aria-label="Copy call details"
                            >
                              {isCopied ? (
                                <Check size={16} className="text-signature-forest" />
                              ) : (
                                <Copy size={16} className="text-muted-foreground" />
                              )}
                            </button>

                            <button
                              id={`report-call-${call.id}`}
                              onClick={() => handleReport(call)}
                              className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center active:scale-90 transition-all"
                              aria-label="Report this call"
                            >
                              <Flag size={15} className="text-destructive" />
                            </button>
                          </div>
                        </div>

                        {/* Room ID (subtle, monospace) */}
                        <p className="mt-2 ml-13 text-[10px] font-mono text-muted-foreground/60 truncate pl-[52px]">
                          ID: {call.roomId.slice(0, 20)}…
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <p className="text-center text-xs text-muted-foreground pt-1">
              Spot something wrong? Use the{" "}
              <span className="text-destructive">⚑</span> flag to report with proof.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
