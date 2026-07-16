import type { Metadata } from "next";
import PolicyPage from "@/components/custom/PolicyPage";
import { privacyPolicy } from "@/constants/policies";

export const metadata: Metadata = {
  title: "Privacy Policy — NawaNapam",
  description:
    "How NawaNapam collects, stores, and protects your data across video calls and the platform.",
};

export default function Page() {
  return <PolicyPage {...privacyPolicy} />;
}
