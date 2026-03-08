import type { Metadata } from "next";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata(
  "개발 페이지 | 웰니스박스",
  "웰니스박스 개발 및 테스트 전용 페이지입니다."
);

export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
