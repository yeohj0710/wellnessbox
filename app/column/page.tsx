import type { Metadata } from "next";
import { getAllColumnSummaries, getAllColumnTags } from "./_lib/columns";
import { isColumnAdminSession } from "./_lib/admin-session";
import ColumnHomeClient from "./_components/ColumnHomeClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "웰니스박스 칼럼 | 건강기능식품 복용 가이드",
  description:
    "웰니스박스 칼럼에서 비타민, 오메가3, 유산균, 철분 등 건강기능식품 복용법을 쉽고 친절하게 확인하세요.",
  alternates: {
    canonical: "/column",
  },
  openGraph: {
    title: "웰니스박스 칼럼 | 건강기능식품 복용 가이드",
    description:
      "웰니스박스가 초보자 눈높이로 정리한 건강기능식품 복용 팁과 생활 건강 인사이트를 확인하세요.",
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

  return <ColumnHomeClient initialColumns={columns} tags={tags} isAdmin={isAdmin} />;
}
