import type { Metadata } from "next";
import SurveyPageClient from "./survey-page-client";

export const metadata: Metadata = {
  title: "B2B 건강 설문",
  description: "웰니스박스 B2B 건강 설문을 웹에서 직접 진행합니다.",
};

export default function SurveyPage() {
  return <SurveyPageClient />;
}
