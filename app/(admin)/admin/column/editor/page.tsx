import type { Metadata } from "next";
import EditorAdminClient from "./EditorAdminClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "칼럼 관리자 편집기 | WellnessBox",
  description: "관리자 전용 칼럼 CMS 편집기",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminColumnEditorPage() {
  return <EditorAdminClient allowDevFileSave={process.env.NODE_ENV !== "production"} />;
}
