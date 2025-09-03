import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "빠른 AI 검사 | 웰니스박스",
  description:
    "AI 검사를 통해 1분만에 건강 상태를 평가하고 맞춤 영양제 카테고리를 추천받아요.",
  openGraph: {
    title: "빠른 AI 검사 | 웰니스박스",
    description:
      "AI 검사를 통해 1분만에 건강 상태를 평가하고 맞춤 영양제 카테고리를 추천받아요.",
    url: `${SITE_URL}/check-ai`,
    images: [
      { url: "/kakao-logo.png", width: 800, height: 400, alt: "웰니스박스" },
      { url: "/logo.png", width: 800, height: 800, alt: "웰니스박스" },
    ],
    siteName: "웰니스박스",
  },
  twitter: {
    card: "summary_large_image",
    title: "빠른 AI 검사 | 웰니스박스",
    description:
      "AI 검사를 통해 1분만에 건강 상태를 평가하고 맞춤 영양제 카테고리를 추천받아요.",
    images: ["/logo.png"],
  },
};

export default function CheckAILayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
