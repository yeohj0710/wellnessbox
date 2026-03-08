import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

const baseMetadata = createPageMetadata({
  title: "빠른 AI 검사 | 웰니스박스",
  description:
    "AI 검사를 통해 1분만에 건강 상태를 평가하고 맞춤 영양제 카테고리를 추천받아요.",
  path: "/check-ai",
  keywords: ["AI 건강 검사", "맞춤 영양제 추천", "건강 상태 평가", "웰니스박스"],
});

export const metadata: Metadata = {
  ...baseMetadata,
  alternates: {
    canonical: "/check-ai",
    languages: {
      "ko-KR": "/check-ai",
      "en-US": "/en/check-ai",
      "x-default": "/check-ai",
    },
  },
};

export default function CheckAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
