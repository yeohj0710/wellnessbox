import type { Metadata } from "next";
import Link from "next/link";
import { getAllColumnSummaries, getAllColumnTags, normalizeTagSlug } from "./_lib/columns";
import { isColumnEditorEnabled } from "./_lib/editor-access";

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

export default async function ColumnPage() {
  const [columns, tags] = await Promise.all([
    getAllColumnSummaries(),
    getAllColumnTags(),
  ]);
  const editorEnabled = isColumnEditorEnabled();

  return (
    <section className="w-full min-h-[calc(100vh-7rem)] bg-[radial-gradient(circle_at_top_left,_#d8f6eb_0%,_#f8fafc_45%,_#ffffff_100%)]">
      <div className="mx-auto w-full max-w-4xl px-4 pb-20 pt-10 sm:px-6">
        <header className="rounded-3xl border border-emerald-200/70 bg-white/90 p-6 shadow-[0_18px_40px_-28px_rgba(6,95,70,0.55)] sm:p-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-emerald-700">
            웰니스박스 칼럼
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-slate-900 sm:text-[2.15rem]">
            건강 정보를 쉽고 정확하게 정리합니다
          </h1>
          <p className="mt-4 text-[1.01rem] leading-7 text-slate-700 sm:text-[1.05rem]">
            웰니스박스 칼럼은 건강기능식품 복용, 생활 습관, 일상 관리 팁을
            텍스트 중심으로 제공합니다. 검색봇이 읽을 수 있는 형태로 작성되어
            빠르게 핵심을 확인할 수 있습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <Link
              href="/column/rss.xml"
              className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-100"
            >
              RSS 구독
            </Link>
            {editorEnabled && (
              <Link
                href="/column/editor"
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
              >
                칼럼 에디터
              </Link>
            )}
          </div>
        </header>

        {tags.length > 0 && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white/95 p-5">
            <h2 className="text-sm font-bold text-slate-700">태그로 보기</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={`tag-${tag.slug}`}
                  href={`/column/tag/${normalizeTagSlug(tag.label)}`}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  #{tag.label} ({tag.count})
                </Link>
              ))}
            </div>
          </section>
        )}

        {columns.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-slate-600">
            등록된 칼럼이 아직 없습니다.
          </div>
        ) : (
          <ul className="mt-8 grid gap-5">
            {columns.map((column) => (
              <li key={column.slug}>
                <article className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_14px_30px_-26px_rgba(15,23,42,0.65)]">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                    <time dateTime={column.publishedAt}>
                      {formatDate(column.publishedAt)}
                    </time>
                    <span aria-hidden>·</span>
                    <span>약 {column.readingMinutes}분</span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
                    <Link
                      href={`/column/${column.slug}`}
                      className="transition hover:text-emerald-700"
                    >
                      {column.title}
                    </Link>
                  </h2>
                  <p className="mt-3 text-[1rem] leading-7 text-slate-700">
                    {column.summary}
                  </p>
                  {column.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {column.tags.map((tag) => (
                        <Link
                          key={`${column.slug}-${tag}`}
                          href={`/column/tag/${normalizeTagSlug(tag)}`}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
