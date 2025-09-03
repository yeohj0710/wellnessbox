import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "상품 둘러보기 | 웰니스박스",
  description: "영양제 인기 성분을 살펴보고 나에게 맞는 영양제를 찾아보세요.",
  openGraph: {
    title: "상품 둘러보기 | 웰니스박스",
    description: "영양제 인기 성분을 살펴보고 나에게 맞는 영양제를 찾아보세요.",
    url: `${SITE_URL}/explore`,
    images: [
      { url: "/kakao-logo.png", width: 800, height: 400, alt: "웰니스박스" },
      { url: "/logo.png", width: 800, height: 800, alt: "웰니스박스" },
    ],
    siteName: "웰니스박스",
  },
  twitter: {
    card: "summary_large_image",
    title: "상품 둘러보기 | 웰니스박스",
    description: "영양제 인기 성분을 살펴보고 나에게 맞는 영양제를 찾아보세요.",
    images: ["/logo.png"],
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
