import type { Metadata } from "next";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata(
  "약국 페이지 | 웰니스박스",
  "웰니스박스 약국 운영 전용 페이지입니다."
);

export default function PharmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
