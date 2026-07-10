import type { Metadata } from "next";
import { redirect } from "next/navigation";
import InterimUserConsole from "@/components/tips/InterimUserConsole";
import { hasTipsLabAccess } from "@/lib/server/tips-lab/auth";

export const metadata: Metadata = {
  title: "TIPS 중간 연구 | WellnessBox",
  description: "WellnessBox 추천·안전·PRO·ADR 중간 시뮬레이션",
  robots: { index: false, follow: false, nocache: true },
};

export default async function TipsInterimPage() {
  if (!(await hasTipsLabAccess())) redirect("/test-login?redirect=/tips");
  return <InterimUserConsole />;
}
