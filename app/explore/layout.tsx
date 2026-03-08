import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "상품 둘러보기 | 웰니스박스",
  description: "영양제 인기 성분을 살펴보고 나에게 맞는 영양제를 찾아보세요.",
  path: "/explore",
  keywords: ["영양제 추천", "건강기능식품", "인기 성분", "웰니스박스"],
});

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
