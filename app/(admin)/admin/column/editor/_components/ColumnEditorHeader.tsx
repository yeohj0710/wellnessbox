"use client";

import Link from "next/link";

export function ColumnEditorHeader() {
  return (
    <header className="rounded-3xl border border-slate-200 bg-white/95 p-6 sm:p-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-slate-600">ADMIN COLUMN CMS</p>
      <h1 className="mt-2 text-3xl font-black text-slate-900">칼럼 관리자 편집기</h1>
      <p className="mt-3 text-slate-700">
        게시글 생성/수정/발행/삭제를 여기서 처리합니다. 공개 페이지는 DB 발행본을 우선
        사용하며, 없으면 파일 기반 칼럼을 fallback으로 제공합니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href="/column" className="text-emerald-700 hover:underline">
          공개 칼럼 보기
        </Link>
        <span className="text-slate-300">|</span>
        <span className="text-slate-500">
          이미지 업로드는 Cloudflare Direct Upload(`/public`)를 사용합니다.
        </span>
      </div>
    </header>
  );
}
