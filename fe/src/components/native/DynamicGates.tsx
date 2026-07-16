"use client";

import dynamic from "next/dynamic";
import PulseLoader from "@/components/custom/Loader";

// `ssr: false` means these mount client-side only (they need to read the
// Capacitor bridge before deciding which UI to render). Without a `loading`
// fallback that's a blank page until hydration finishes, which regresses web
// (these pages used to render on the server) more than it needs to.
const gateLoading = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <PulseLoader />
  </div>
);

export const DynamicDashboardGate = dynamic(
  () => import("./NativeDashboardGate"),
  { ssr: false, loading: gateLoading },
);

export const DynamicSettingsGate = dynamic(
  () => import("./NativeSettingsGate"),
  { ssr: false, loading: gateLoading },
);

export const DynamicCallHistoryGate = dynamic(
  () => import("./NativeCallHistoryGate"),
  { ssr: false, loading: gateLoading },
);
