import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "임직원 건강 리포트 | 웰니스박스",
  description:
    "웰니스박스 임직원 건강 리포트에서 건강검진과 설문 데이터를 바탕으로 맞춤형 건강 인사이트를 확인하세요.",
  path: "/employee-report",
  keywords: ["임직원 건강 리포트", "B2B 건강관리", "건강 인사이트", "웰니스박스"],
});

export default function EmployeeReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
