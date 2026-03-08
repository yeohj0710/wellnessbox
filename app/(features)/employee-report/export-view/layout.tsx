import type { Metadata } from "next";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = createNoIndexMetadata(
  "리포트 내보내기 | 웰니스박스",
  "웰니스박스 임직원 건강 리포트 내보내기 전용 페이지입니다."
);

export default function EmployeeReportExportViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
