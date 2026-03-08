import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "정밀 AI 검사 | 웰니스박스",
  description:
    "정밀 AI 검사를 통해 건강 상태를 평가하고 맞춤 영양제 카테고리를 추천받아요.",
  path: "/assess",
  keywords: ["정밀 AI 검사", "맞춤 영양제 추천", "건강 설문", "웰니스박스"],
});

export default function AssessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
