import type { Metadata } from "next";
import PolicyPage from "@/components/custom/PolicyPage";
import { ourFounders } from "@/constants/policies";

export const metadata: Metadata = {
  title: "Our Founders — NawaNapam",
  description: "The people behind NawaNapam.",
};

export default function Page() {
  return <PolicyPage {...ourFounders} />;
}
