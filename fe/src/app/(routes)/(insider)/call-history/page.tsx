import Private from "@/components/auth/Private";
import { DynamicCallHistoryGate } from "@/components/native/DynamicGates";

export default function Page() {
  return (
    <Private>
      <DynamicCallHistoryGate />
    </Private>
  );
}



