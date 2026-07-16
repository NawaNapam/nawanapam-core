"use client";

import { platform } from "@/platform";
import NativeShell from "./NativeShell";
import NativeCallHistory from "./NativeCallHistory";
import CallHistoryPage from "@/components/custom/CallHistory";

export default function NativeCallHistoryGate() {
  if (platform.isNative) {
    return (
      <NativeShell>
        <NativeCallHistory />
      </NativeShell>
    );
  }
  return <CallHistoryPage />;
}

