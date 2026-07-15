"use client";

import { useEffect, useState } from "react";
import { History, Flag, Copy, Check } from "lucide-react";
import { toast } from "@/services/toast";
import Header from "./Header";
import PulseLoader from "./Loader";

const REPORT_FORM_URL =
  process.env.NEXT_PUBLIC_CALL_REPORT_FORM_URL || "";

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
  if (sec == null) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function CallHistoryPage() {
  const [calls, setCalls] = useState<CallHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/call-history");
        if (!res.ok) throw new Error("Failed to load call history");
        const data = await res.json();
        if (!cancelled) setCalls(data.calls ?? []);
      } catch {
        if (!cancelled) toast.error("Could not load your call history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 mt-15">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-md border border-border">
            <History size={20} className="text-signature-coral" />
          </div>
          <h1 className="text-xl md:text-2xl font-medium tracking-tight text-foreground">
            Call History
          </h1>
        </div>

        <p className="text-body text-sm mb-6">
          Your most recent {calls.length > 0 ? "" : "15 "}calls. Spotted
          something unusual in one of them? Report it with proof using the
          linked form.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <PulseLoader />
          </div>
        ) : calls.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-8 text-center text-body text-sm">
            No calls yet. Start a video chat to see your history here.
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.id}
                className="bg-card rounded-lg border border-border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <p className="text-foreground font-medium text-sm">
                    {call.peerUsername ?? "Stranger"}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {new Date(call.createdAt).toLocaleString()} ·{" "}
                    {formatDuration(call.durationSec)}
                  </p>
                  <p className="text-muted-foreground text-[11px] mt-1 font-mono">
                    Call ID: {call.roomId}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopy(call)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md border border-border text-foreground hover:bg-accent transition-colors text-xs font-medium"
                  >
                    {copiedId === call.id ? (
                      <Check size={14} />
                    ) : (
                      <Copy size={14} />
                    )}
                    Copy details
                  </button>
                  <button
                    onClick={() => handleReport(call)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md bg-destructive text-white hover:bg-destructive/90 transition-colors text-xs font-medium"
                  >
                    <Flag size={14} />
                    Report with proof
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
