import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllColumnTags,
  getColumnsByTagSlug,
  normalizeTagSlug,
} from "../../_lib/columns";

type TagPageProps = {
  params: Promise<{ tag: string }>;
};

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

export async function generateStaticParams() {
  const tags = await getAllColumnTags();
  return tags.map((tag) => ({ tag: tag.slug }));
}

export async function generateMetadata({
  params,
}: TagPageProps): Promise<Metadata> {
  const { tag: rawTag } = await params;
  const { tag } = await getColumnsByTagSlug(rawTag);

  if (!tag) {
    return {
      title: "태그를 찾을 수 없습니다 | 웰니스박스 칼럼",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `#${tag.label} 칼럼 모음 | 웰니스박스`,
    description: `#${tag.label} 관련 웰니스박스 칼럼을 모아볼 수 있습니다.`,
    alternates: {
      canonical: `/column/tag/${normalizeTagSlug(tag.label)}`,
    },
  };
}

export default async function ColumnTagPage({ params }: TagPageProps) {
  const { tag: rawTag } = await params;
  const { tag, columns } = await getColumnsByTagSlug(rawTag);

  if (!tag) {
    notFound();
  }

  return (
    <section className="w-full min-h-[calc(100vh-7rem)] bg-[radial-gradient(circle_at_top_left,_#eff6ff_0%,_#f8fafc_45%,_#ffffff_100%)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6">
        <header className="rounded-3xl border border-slate-200 bg-white/95 p-6 sm:p-8">
          <Link
            href="/column"
            className="text-sm font-medium text-slate-600 hover:text-emerald-700"
          >
            ← 칼럼 목록으로
          </Link>
          <h1 className="mt-3 text-3xl font-black text-slate-900">
            #{tag.label}
          </h1>
          <p className="mt-3 text-slate-700">
            이 태그가 포함된 칼럼 {columns.length}개를 모았습니다.
          </p>
        </header>

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
      </div>
    </section>
  );
}
