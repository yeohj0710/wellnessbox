import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "내 주문 조회 | 웰니스박스",
  description:
    "전화번호와 비밀번호로 나만의 맞춤 영양제 주문 내역을 10초만에 확인해요.",
  openGraph: {
    title: "내 주문 조회 | 웰니스박스",
    description:
      "전화번호와 비밀번호로 나만의 맞춤 영양제 주문 내역을 10초만에 확인해요.",
    url: `${SITE_URL}/my-orders`,
    images: [
      { url: "/kakao-logo.png", width: 800, height: 400, alt: "웰니스박스" },
      { url: "/logo.png", width: 800, height: 800, alt: "웰니스박스" },
    ],
    siteName: "웰니스박스",
  },
  twitter: {
    card: "summary_large_image",
    title: "내 주문 조회 | 웰니스박스",
    description:
      "전화번호와 비밀번호로 웰니스박스 나만의 맞춤 주문 내역을 10초만에 확인해요.",
    images: ["/logo.png"],
  },
};

export default function MyOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
