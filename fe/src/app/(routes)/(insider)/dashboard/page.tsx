// "use client"
import Private from "@/components/auth/Private";
import { DynamicDashboardGate } from "@/components/native/DynamicGates";

export default function Page() {
  return (
    <Private>
      <DynamicDashboardGate />
    </Private>
  );
}



