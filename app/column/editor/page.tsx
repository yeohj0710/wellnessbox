import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isColumnEditorEnabled } from "../_lib/editor-access";
import EditorClient from "./EditorClient";

export const metadata: Metadata = {
  title: "칼럼 에디터 | 웰니스박스",
  description:
    "웰니스박스 칼럼 초안을 작성하고 마크다운 파일로 내보내는 편집 도구입니다.",
  alternates: {
    canonical: "/column/editor",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function ColumnEditorPage() {
  if (!isColumnEditorEnabled()) {
    notFound();
  }

  return <EditorClient />;
}
