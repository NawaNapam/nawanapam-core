
import Private from "@/components/auth/Private";
import { DynamicSettingsGate } from "@/components/native/DynamicGates";

export default function Page() {
  return (
    <Private>
      <DynamicSettingsGate />
    </Private>
  );
}



