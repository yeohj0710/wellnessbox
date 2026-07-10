import type { Metadata } from "next";
import InterimRoleConsole from "@/components/tips/InterimRoleConsole";

export const metadata: Metadata = { title: "TIPS 약사 검토함 | WellnessBox" };

export default function PharmTipsPage() {
  return <InterimRoleConsole role="pharm" />;
}
