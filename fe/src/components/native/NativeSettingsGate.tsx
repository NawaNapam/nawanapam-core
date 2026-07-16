"use client";

import { platform } from "@/platform";
import NativeSettings from "./NativeSettings";
import NativeShell from "./NativeShell";
import ProfileSettingsPage from "@/components/custom/UpdateProfileForm";

export default function NativeSettingsGate() {
  if (platform.isNative) {
    return (
      <NativeShell>
        <NativeSettings />
      </NativeShell>
    );
  }
  return (
    <div>
      <ProfileSettingsPage />
    </div>
  );
}
