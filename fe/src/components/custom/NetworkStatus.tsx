"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "@/services/toast";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);
    setShowBanner(!navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(false);
      toast.success("You are back online!", {
        description: "Your connection has been restored",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      toast.error("You are offline", {
        description: "Some features may not be available",
        duration: 10000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <>
      {/* Fixed Banner at Top */}
      <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300 pt-(--status-bar-height)">
        <div className="bg-destructive text-destructive-foreground px-4 py-3 shadow-lg">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive-foreground"></span>
              </div>
              <div className="flex items-center gap-2">
                <WifiOff className="h-4 w-4" />
                <span className="text-sm font-medium">
                  No Internet Connection
                </span>
              </div>
              <span className="hidden sm:inline text-xs opacity-90">
                • Some features may not work properly
              </span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-medium px-3 py-1 rounded-md bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>

      {/* Floating Indicator (Alternative/Additional) */}
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-500">
        <div className="flex items-center gap-3 rounded-full bg-red-400 px-5 py-3 text-sm font-medium text-destructive-foreground shadow-xl backdrop-blur-sm border border-destructive-foreground/20">
          <WifiOff className="h-4 w-4 animate-pulse" />
          <span className="hidden sm:inline">Offline</span>
        </div>
      </div>
    </>
  );
}
