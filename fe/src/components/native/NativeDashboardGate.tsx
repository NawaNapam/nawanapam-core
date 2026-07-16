"use client";

/**
 * Client-only gate: checks platform at runtime and renders either the native
 * or web dashboard. The page itself stays a Server Component so authOptions
 * and google-auth-library never enter the client bundle.
 */
import { platform } from "@/platform";
import NativeDashboard from "./NativeDashboard";
import NativeShell from "./NativeShell";
import Dashboard from "@/components/custom/Dashboard";

export default function NativeDashboardGate() {
  if (platform.isNative) {
    return (
      <NativeShell>
        <NativeDashboard />
      </NativeShell>
    );
  }
  return <Dashboard />;
}
