import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "AI 맞춤 상담 | 웰니스박스",
  description: "웰니스박스 AI 상담은 로그인 이후 개인 상황에 맞춰 이어집니다.",
  path: "/chat",
  noIndex: true,
});

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
