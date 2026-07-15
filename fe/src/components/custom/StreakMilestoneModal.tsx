"use client";

import { useEffect, useState } from "react";
import { Download, Share2, PartyPopper } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { shareService } from "@/services/share";

type Props = {
  streak: number | null;
  onClose: () => void;
};

// Fires when the user crosses a shareable streak milestone (10/50/100 days).
// Offers a generated badge image they can share via the device share sheet
// (Instagram Stories on mobile picks it up directly) or download.
export default function StreakMilestoneModal({ streak, onClose }: Props) {
  const [canShareFile, setCanShareFile] = useState(false);
  const [sharing, setSharing] = useState(false);

  const open = streak !== null;
  const badgeUrl = streak ? `/api/nm-score/badge?streak=${streak}` : "";

  useEffect(() => {
    if (!open) return;
    // Feature-detect file-sharing support (native Capacitor always can; mobile
    // browsers only when the Web Share API's file support is present).
    setCanShareFile(shareService.canShareFiles());
  }, [open]);

  async function handleShare() {
    if (!streak) return;
    setSharing(true);
    try {
      const res = await fetch(badgeUrl);
      const blob = await res.blob();
      const file = new File([blob], `nawa-napam-streak-${streak}.png`, { type: "image/png" });

      const shared = await shareService.share({
        files: [file],
        title: `${streak}-day streak on Nawa Napam`,
        text: `${streak}-day streak on Nawa Napam! 🔥`,
      });
      if (!shared) {
        handleDownload();
      }
    } catch {
      // User cancelled the share sheet or it failed — no-op.
    } finally {
      setSharing(false);
    }
  }

  function handleDownload() {
    const a = document.createElement("a");
    a.href = badgeUrl;
    a.download = `nawa-napam-streak-${streak}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper size={20} className="text-signature-coral" />
            {streak}-day streak!
          </DialogTitle>
          <DialogDescription>
            You&apos;ve shown up {streak} days in a row. Share your badge or keep it as a
            souvenir.
          </DialogDescription>
        </DialogHeader>

        {open && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={badgeUrl}
            alt={`${streak}-day streak badge`}
            className="w-full rounded-md border border-border"
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleDownload} className="gap-2">
            <Download size={16} />
            Download
          </Button>
          {canShareFile && (
            <Button onClick={handleShare} disabled={sharing} className="gap-2">
              <Share2 size={16} />
              {sharing ? "Sharing…" : "Share"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
