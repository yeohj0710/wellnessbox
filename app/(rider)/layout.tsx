import type { Metadata } from "next";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata(
  "배송 파트너 페이지 | 웰니스박스",
  "웰니스박스 배송 운영 전용 페이지입니다."
);

export default function RiderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
