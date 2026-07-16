import type { Metadata } from "next";
import PolicyPage from "@/components/custom/PolicyPage";
import { termsOfService } from "@/constants/policies";

export const metadata: Metadata = {
  title: "Terms of Service — NawaNapam",
  description: "The rules you agree to by using NawaNapam.",
};

export default function Page() {
  return <PolicyPage {...termsOfService} />;
}
