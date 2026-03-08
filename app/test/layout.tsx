import type { Metadata } from "next";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata(
  "테스트 페이지 | 웰니스박스",
  "웰니스박스 테스트 전용 페이지입니다."
);

export default function TestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
