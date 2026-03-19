import type { Metadata } from "next";
import SurveyPageClient from "./survey-page-client";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "B2B 건강 설문 | 웰니스박스",
  description:
    "웰니스박스 B2B 건강 설문은 참여자별 건강 상태를 확인하기 위한 내부 진행용 흐름입니다.",
  path: "/survey",
  keywords: ["B2B 건강 설문", "임직원 건강 설문", "웰니스박스"],
  noIndex: true,
});

export default function SurveyPage() {
  return <SurveyPageClient />;
}
