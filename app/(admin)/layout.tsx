import type { Metadata } from "next";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata(
  "관리자 페이지 | 웰니스박스",
  "웰니스박스 운영 전용 관리자 페이지입니다."
);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
