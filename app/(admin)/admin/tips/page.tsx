import type { Metadata } from "next";
import InterimRoleConsole from "@/components/tips/InterimRoleConsole";

export const metadata: Metadata = { title: "TIPS 연구 현황 | WellnessBox" };

export default function AdminTipsPage() {
  return <InterimRoleConsole role="admin" />;
}
