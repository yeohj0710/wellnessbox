"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ColumnAdminActions from "./ColumnAdminActions";

type ColumnSummary = {
  postId: string | null;
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  tags: string[];
  coverImageUrl: string | null;
  readingMinutes: number;
};

type ColumnTag = {
  label: string;
  slug: string;
  count: number;
};

type ColumnHomeClientProps = {
  initialColumns: ColumnSummary[];
  tags: ColumnTag[];
  isAdmin: boolean;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function normalizeTagSlugClient(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ColumnHomeClient({
  initialColumns,
  tags,
  isAdmin,
}: ColumnHomeClientProps) {
  const [columns, setColumns] = useState(initialColumns);
  const [query, setQuery] = useState("");

  const filteredColumns = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return columns;
    return columns.filter((column) => {
      const haystack = [
        column.title,
        column.summary,
        column.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [columns, query]);

  return (
    <section className="w-full min-h-[calc(100vh-7rem)] bg-[radial-gradient(circle_at_top_left,_#d8f6eb_0%,_#f8fafc_45%,_#ffffff_100%)]">
      <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-10 sm:px-6">
        <header className="rounded-3xl border border-emerald-200/70 bg-white/90 p-6 shadow-[0_18px_40px_-28px_rgba(6,95,70,0.55)] sm:p-8">
          <p className="text-xs font-semibold tracking-[0.2em] text-emerald-700">
            웰니스 칼럼
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-slate-900 sm:text-[2.1rem]">
            건강 칼럼
          </h1>
          <p className="mt-4 text-[1rem] leading-7 text-slate-700">
            복약 습관, 생활 관리, 건강 인사이트를 블로그처럼 빠르게 확인하고
            저장하세요.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href="/column"
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            >
              목록
            </Link>
            <a
              href="#column-tags"
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
            >
              태그
            </a>
            <label className="ml-auto flex min-w-[220px] items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 sm:min-w-[260px]">
              <span className="font-semibold">검색</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="제목/태그/요약"
                className="w-full border-none bg-transparent text-sm outline-none"
              />
            </label>
            {isAdmin ? (
              <Link
                href="/admin/column/editor"
                data-testid="column-admin-write"
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                글쓰기
              </Link>
            ) : null}
          </div>
        </header>

        {tags.length > 0 ? (
          <section
            id="column-tags"
            className="mt-6 rounded-3xl border border-slate-200 bg-white/95 p-5"
          >
            <h2 className="text-sm font-bold text-slate-700">태그로 보기</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={`tag-${tag.slug}`}
                  href={`/column/tag/${tag.slug}`}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  #{tag.label} ({tag.count})
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {filteredColumns.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-slate-600">
            {columns.length === 0
              ? "등록된 칼럼이 아직 없습니다."
              : "검색 조건에 맞는 칼럼이 없습니다."}
          </div>
        ) : (
          <ul className="mt-8 grid gap-5">
            {filteredColumns.map((column) => (
              <li key={column.slug}>
                <article
                  data-testid="column-card"
                  data-post-id={column.postId ?? ""}
                  className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_14px_30px_-26px_rgba(15,23,42,0.65)]"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                    <time dateTime={column.publishedAt}>{formatDate(column.publishedAt)}</time>
                    <span aria-hidden>·</span>
                    <span>약 {column.readingMinutes}분</span>
                  </div>

                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <h2 className="text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
                      <Link
                        href={`/column/${column.slug}`}
                        className="transition hover:text-emerald-700"
                      >
                        {column.title}
                      </Link>
                    </h2>
                    {isAdmin ? (
                      <ColumnAdminActions
                        postId={column.postId}
                        title={column.title}
                        onDeleted={(deletedPostId) => {
                          setColumns((prev) =>
                            prev.filter((item) => item.postId !== deletedPostId)
                          );
                        }}
                      />
                    ) : null}
                  </div>

                  {column.coverImageUrl ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={column.coverImageUrl}
                        alt={`${column.title} 커버 이미지`}
                        className="h-44 w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ) : null}

                  <p className="mt-4 text-[1rem] leading-7 text-slate-700">
                    {column.summary}
                  </p>
                  {column.tags.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {column.tags.map((tag) => (
                        <Link
                          key={`${column.slug}-${tag}`}
                          href={`/column/tag/${normalizeTagSlugClient(tag)}`}
                          className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
