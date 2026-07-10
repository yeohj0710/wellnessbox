import type { Metadata } from "next";
import InterimUserConsole from "@/components/tips/InterimUserConsole";

export const metadata: Metadata = {
  title: "TIPS 중간 연구 | WellnessBox",
  description: "WellnessBox 추천·안전·PRO·ADR 중간 시뮬레이션",
};

export default function TipsInterimPage() {
  return <InterimUserConsole />;
}
