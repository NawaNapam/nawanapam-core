"use client";

import dynamic from "next/dynamic";

export const DynamicDashboardGate = dynamic(
  () => import("./NativeDashboardGate"),
  { ssr: false },
);

export const DynamicSettingsGate = dynamic(
  () => import("./NativeSettingsGate"),
  { ssr: false },
);

export const DynamicCallHistoryGate = dynamic(
  () => import("./NativeCallHistoryGate"),
  { ssr: false },
);
