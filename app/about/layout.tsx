import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "웰니스박스 소개 | 브랜드와 서비스 안내",
  description:
    "웰니스박스의 맞춤 건강 솔루션, 서비스 운영 방향, 문의 및 정책 정보를 확인하세요.",
  path: "/about",
  keywords: ["웰니스박스", "맞춤 영양제", "건강 솔루션", "서비스 소개"],
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
