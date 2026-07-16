import type { Metadata } from "next";
import PolicyPage from "@/components/custom/PolicyPage";
import { communityGuidelines } from "@/constants/policies";

export const metadata: Metadata = {
  title: "Community Guidelines — NawaNapam",
  description: "What respectful, safe behavior looks like on NawaNapam.",
};

export default function Page() {
  return <PolicyPage {...communityGuidelines} />;
}
