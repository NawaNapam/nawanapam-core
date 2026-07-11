import Private from "@/components/auth/Private";
import CallHistoryPage from "@/components/custom/CallHistory";

const Page = () => {
  return (
    <Private>
      <CallHistoryPage />
    </Private>
  );
};

export default Page;
