import type { Metadata } from "next";
import { getAllColumnSummaries, getAllColumnTags } from "./_lib/columns";
import { isColumnAdminSession } from "./_lib/admin-session";
import ColumnHomeClient from "./_components/ColumnHomeClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "웰니스박스 칼럼",
  description:
    "영양제 복용 습관과 건강관리 핵심 정보를 짧고 명확하게 정리한 웰니스박스 칼럼입니다.",
  alternates: {
    canonical: "/column",
  },
  openGraph: {
    title: "웰니스박스 칼럼",
    description:
      "영양제 복용 습관과 건강관리 핵심 정보를 짧고 명확하게 정리한 웰니스박스 칼럼입니다.",
    url: "/column",
    type: "website",
    locale: "ko_KR",
  },
};

export default async function ColumnPage() {
  const [columns, tags, isAdmin] = await Promise.all([
    getAllColumnSummaries(),
    getAllColumnTags(),
    isColumnAdminSession(),
  ]);

  return (
    <ColumnHomeClient initialColumns={columns} tags={tags} isAdmin={isAdmin} />
  );
}
