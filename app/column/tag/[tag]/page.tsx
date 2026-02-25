import type { Metadata } from "next";
import Link from "next/link";

import { isColumnAdminSession } from "../../_lib/admin-session";
import {
  getColumnsByTagSlug,
  normalizeTagSlug,
} from "../../_lib/columns";

export const dynamic = "force-dynamic";

type TagPageProps = {
  params: Promise<{ tag: string }>;
};

function decodeTagLabel(rawTag: string) {
  try {
    const decoded = decodeURIComponent(rawTag).trim();
    if (!decoded) return "";
    return decoded.startsWith("#") ? decoded.slice(1).trim() : decoded;
  } catch {
    const text = rawTag.trim();
    return text.startsWith("#") ? text.slice(1).trim() : text;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag: rawTag } = await params;
  const { tag } = await getColumnsByTagSlug(rawTag);
  const fallbackLabel = decodeTagLabel(rawTag) || "태그";
  const label = tag?.label || fallbackLabel;

  if (!tag) {
    return {
      title: `#${label} 칼럼 모음 | 웰니스박스`,
      description: `#${label} 태그에 해당하는 칼럼이 아직 없습니다.`,
      robots: { index: false, follow: true },
      alternates: { canonical: `/column/tag/${normalizeTagSlug(label)}` },
    };
  }

  return {
    title: `#${label} 칼럼 모음 | 웰니스박스`,
    description: `#${label} 관련 웰니스박스 칼럼을 모아볼 수 있습니다.`,
    alternates: { canonical: `/column/tag/${normalizeTagSlug(label)}` },
  };
}

export default async function ColumnTagPage({ params }: TagPageProps) {
  const { tag: rawTag } = await params;
  const [{ tag, columns }, isAdmin] = await Promise.all([
    getColumnsByTagSlug(rawTag),
    isColumnAdminSession(),
  ]);
  const label = tag?.label || decodeTagLabel(rawTag) || "태그";

  return (
    <section className="w-full min-h-[calc(100vh-7rem)] bg-[radial-gradient(circle_at_top_left,_#eff6ff_0%,_#f8fafc_45%,_#ffffff_100%)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6">
        <header className="rounded-3xl border border-slate-200 bg-white/95 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/column"
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            >
              목록
            </Link>
            <Link
              href="/column#column-tags"
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            >
              태그
            </Link>
            <Link
              href="/column"
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            >
              검색
            </Link>
            {isAdmin ? (
              <Link
                href="/admin/column/editor"
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                글쓰기
              </Link>
            ) : null}
          </div>

          <h1 className="mt-3 text-3xl font-black text-slate-900">#{label}</h1>
          <p className="mt-3 text-slate-700">
            이 태그가 포함된 칼럼 {columns.length}개를 모아봤습니다.
          </p>
        </header>

        {columns.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/90 p-8 text-center text-slate-600">
            아직 이 태그의 칼럼이 없습니다. 곧 업데이트할게요.
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {columns.map((column) => (
              <li key={column.slug}>
                <Link
                  href={`/column/${column.slug}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-emerald-300"
                >
                  <p className="text-xs text-slate-500">
                    {formatDate(column.publishedAt)} · 약 {column.readingMinutes}분
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-slate-900">
                    {column.title}
                  </h2>
                  <p className="mt-2 text-slate-700">{column.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
