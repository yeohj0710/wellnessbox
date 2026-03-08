import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "내 주문 조회 | 웰니스박스",
  description:
    "전화번호와 비밀번호로 나만의 맞춤 영양제 주문 내역을 10초만에 확인해요.",
  path: "/my-orders",
  noIndex: true,
});

export default function MyOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
