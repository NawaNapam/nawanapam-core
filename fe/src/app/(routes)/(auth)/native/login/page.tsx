import Public from "@/components/auth/Public";
import NativeLoginPage from "@/components/custom/NativeLoginPage";
import React from "react";

const Page = () => {
  return (
    <Public>
      <NativeLoginPage />
    </Public>
  );
};

export default Page;
