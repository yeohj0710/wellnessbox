import type { Metadata } from "next";
import SurveyPageClient from "./survey-page-client";

export const metadata: Metadata = {
  title: "B2B 건강 설문 | 웰니스박스",
  description:
    "웰니스박스 B2B 건강 설문을 웹에서 직접 진행하고 결과를 확인할 수 있습니다.",
};

export default function SurveyPage() {
  return <SurveyPageClient />;
}
