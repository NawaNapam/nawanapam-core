import type { Metadata } from "next";
import PolicyPage from "@/components/custom/PolicyPage";
import { dataSafety } from "@/constants/policies";

export const metadata: Metadata = {
  title: "Data Safety — NawaNapam",
  description: "How your data is handled, stored, and protected on NawaNapam.",
};

export default function Page() {
  return <PolicyPage {...dataSafety} />;
}
