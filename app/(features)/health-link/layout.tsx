import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "건강검진 연동 | 웰니스박스",
  description:
    "건강검진과 건강 데이터를 연동해 웰니스박스에서 더 정교한 맞춤 건강 인사이트를 확인하세요.",
  path: "/health-link",
  keywords: ["건강검진 연동", "건강 데이터", "맞춤 건강 관리", "웰니스박스"],
});

export default function HealthLinkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
