import type { Metadata } from "next";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata(
  "내 데이터 | 웰니스박스",
  "웰니스박스 사용자 전용 내 데이터 페이지입니다."
);

export default function MyDataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
