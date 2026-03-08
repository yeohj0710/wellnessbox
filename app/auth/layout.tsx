import type { Metadata } from "next";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata(
  "인증 페이지 | 웰니스박스",
  "웰니스박스 인증 전용 페이지입니다."
);

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
