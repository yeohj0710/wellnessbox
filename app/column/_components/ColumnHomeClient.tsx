"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type MouseEvent,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ColumnSummary, ColumnTag } from "../_lib/columns-types";
import ColumnAdminActions from "./ColumnAdminActions";
import ColumnThumbnail from "./ColumnThumbnail";

type ColumnHomeClientProps = {
  initialColumns: ColumnSummary[];
  tags: ColumnTag[];
  isAdmin: boolean;
};

type ViewMode = "grid" | "list";

const ALL_TAG = "__all__";
const PAGE_SIZE_OPTIONS = [12, 24, 48, 1000000] as const;
const DOT = "\u2022";

const TEXT = {
  totalPosts: "\uC804\uCCB4 \uAE00",
  totalTags: "\uD0DC\uADF8 \uC218",
  latestPublish: "\uCD5C\uC2E0 \uBC1C\uD589",
  notReady: "\uC900\uBE44 \uC911",
  browseSettings: "\uD0D0\uC0C9 \uC124\uC815",
  browseBody:
    "\uAC80\uC0C9, \uD0DC\uADF8, \uBCF4\uAE30 \uBC00\uB3C4\uB97C \uC870\uD569\uD574\uC11C \uC6D0\uD558\uB294 \uAE00\uB9CC \uC881\uD600\uBCF4\uC138\uC694.",
  allList: "\uC804\uCCB4 \uBAA9\uB85D",
  jumpToResults: "\uACB0\uACFC \uBC14\uB85C\uAC00\uAE30",
  writePost: "\uAE00 \uC4F0\uAE30",
  search: "\uAC80\uC0C9",
  tag: "\uD0DC\uADF8",
  view: "\uBCF4\uAE30",
  count: "\uAC1C\uC218",
  all: "\uC804\uCCB4",
  cardView: "\uCE74\uB4DC\uD615",
  listView: "\uB9AC\uC2A4\uD2B8\uD615",
  searchPlaceholder:
    "\uC81C\uBAA9, \uC694\uC57D, \uD0DC\uADF8\uB85C \uAC80\uC0C9",
  heroTitle:
    "\uAE00\uC774 \uB9CE\uC544\uC838\uB3C4 \uBC14\uB85C \uCC3E\uD788\uB294 \uAC74\uAC15 \uCE7C\uB7FC \uC544\uCE74\uC774\uBE0C",
  heroBody:
    "\uBCF5\uC6A9 \uC2DC\uAC04, \uC74C\uC2DD-\uC57D \uC0C1\uD638\uC791\uC6A9, \uC0DD\uD65C \uC2B5\uAD00 \uC774\uC288\uB97C \uD55C \uD654\uBA74\uC5D0\uC11C \uC815\uB9AC\uD574\uC11C \uBCFC \uC218 \uC788\uAC8C \uAD6C\uC870\uB97C \uBC14\uAFE8\uC2B5\uB2C8\uB2E4. \uAC80\uC0C9\uB9CC \uD558\uC9C0 \uC54A\uC544\uB3C4 \uD0DC\uADF8, \uBCF4\uAE30 \uBC29\uC2DD, \uD398\uC774\uC9C0 \uB2E8\uC704\uB85C \uBE60\uB974\uAC8C \uD6D1\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
  latestColumn: "\uCD5C\uC2E0 \uCE7C\uB7FC",
  resultsEyebrow: "RESULTS",
  resultsTitle:
    "\uC6D0\uD558\uB294 \uBC00\uB3C4\uB85C \uC815\uB9AC\uD55C \uCE7C\uB7FC \uBAA9\uB85D",
  emptyNoPosts:
    "\uB4F1\uB85D\uB41C \uCE7C\uB7FC\uC774 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4.",
  emptyNoResults:
    "\uAC80\uC0C9\uC5B4\uB098 \uD0DC\uADF8 \uC870\uAC74\uC744 \uC870\uAE08 \uB113\uD600\uC11C \uB2E4\uC2DC \uCC3E\uC544\uBCF4\uC138\uC694.",
  noMatching:
    "\uC870\uAC74\uC5D0 \uB9DE\uB294 \uCE7C\uB7FC\uC774 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4.",
  previous: "\uC774\uC804",
  next: "\uB2E4\uC74C",
  searchResultsSuffix: "\uAC80\uC0C9",
  resultCountSuffix: "\uAC1C \uAE00",
} as const;

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

function isCardInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("a,button,input,textarea,select,label,[role='button']")
  );
}

function buildPageWindow(currentPage: number, pageCount: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, pageCount, currentPage]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 1 && page < pageCount) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

function formatPageSize(value: number) {
  return value >= 1000000 ? TEXT.all : `${value}${"\uAC1C"}`;
}

function ColumnResultCard({
  column,
  isAdmin,
  viewMode,
  onDeleted,
  onCardClick,
  onCardKeyDown,
}: {
  column: ColumnSummary;
  isAdmin: boolean;
  viewMode: ViewMode;
  onDeleted: (deletedPostId: string) => void;
  onCardClick: (event: MouseEvent<HTMLElement>, slug: string) => void;
  onCardKeyDown: (event: KeyboardEvent<HTMLElement>, slug: string) => void;
}) {
  const isList = viewMode === "list";

  return (
    <article
      data-testid="column-card"
      data-post-id={column.postId ?? ""}
      role="link"
      tabIndex={0}
      onClick={(event) => onCardClick(event, column.slug)}
      onKeyDown={(event) => onCardKeyDown(event, column.slug)}
      className={`group cursor-pointer overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white/95 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_20px_45px_-30px_rgba(15,23,42,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${
        isList ? "p-3 sm:p-4" : "p-5 sm:p-6"
      }`}
    >
      <div className={isList ? "grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)]" : ""}>
        <div className={isList ? "overflow-hidden rounded-[1.5rem] border border-slate-200" : ""}>
          <ColumnThumbnail
            slug={column.slug}
            title={column.title}
            tags={column.tags}
            coverImageUrl={column.coverImageUrl}
            alt={`${column.title} ${"\uC378\uB124\uC77C"}`}
            variant={isList ? "list" : "card"}
          />
        </div>

        <div className={isList ? "min-w-0" : "mt-4"}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <time dateTime={column.publishedAt}>{formatDate(column.publishedAt)}</time>
            <span aria-hidden>{DOT}</span>
            <span>{`\uC57D ${column.readingMinutes}\uBD84`}</span>
            {column.tags[0] ? (
              <>
                <span aria-hidden>{DOT}</span>
                <span className="text-emerald-700">{column.tags[0]}</span>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="min-w-0 text-xl font-bold leading-snug text-slate-900 sm:text-2xl">
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
                onDeleted={onDeleted}
              />
            ) : null}
          </div>

          <p className="mt-4 text-[0.99rem] leading-7 text-slate-700">{column.summary}</p>

          {column.tags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {column.tags.map((tag) => (
                <Link
                  key={`${column.slug}-${tag}`}
                  href={`/column/tag/${normalizeTagSlugClient(tag)}`}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function ColumnHomeClient({
  initialColumns,
  tags,
  isAdmin,
}: ColumnHomeClientProps) {
  const router = useRouter();
  const resultsRef = useRef<HTMLElement | null>(null);
  const [columns, setColumns] = useState(initialColumns);
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(ALL_TAG);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [pageSize, setPageSize] = useState<number>(12);
  const [page, setPage] = useState(1);
  const deferredQuery = useDeferredValue(query);

  const openColumn = (slug: string) => {
    router.push(`/column/${slug}`);
  };

  const handleCardClick = (event: MouseEvent<HTMLElement>, slug: string) => {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (isCardInteractiveTarget(event.target)) return;
    openColumn(slug);
  };

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    slug: string
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (isCardInteractiveTarget(event.target)) return;
    event.preventDefault();
    openColumn(slug);
  };

  const filteredColumns = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase();

    return columns.filter((column) => {
      const matchesKeyword =
        !keyword ||
        [column.title, column.summary, column.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      const matchesTag =
        selectedTag === ALL_TAG ||
        column.tags.some((tag) => normalizeTagSlugClient(tag) === selectedTag);
      return matchesKeyword && matchesTag;
    });
  }, [columns, deferredQuery, selectedTag]);

  const featuredColumn = filteredColumns[0] ?? columns[0] ?? null;
  const activeTag = tags.find((tag) => tag.slug === selectedTag) ?? null;
  const pageCount = Math.max(
    1,
    Math.ceil(filteredColumns.length / Math.max(1, pageSize))
  );
  const safePage = Math.min(page, pageCount);
  const pageWindow = buildPageWindow(safePage, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const pagedColumns =
    pageSize >= 1000000
      ? filteredColumns
      : filteredColumns.slice(startIndex, startIndex + pageSize);
  const latestPublishedAt = featuredColumn
    ? formatDate(featuredColumn.publishedAt)
    : null;

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, selectedTag, pageSize]);

  useEffect(() => {
    if (page <= pageCount) return;
    setPage(pageCount);
  }, [page, pageCount]);

  const moveToPage = (nextPage: number) => {
    const clamped = Math.min(Math.max(nextPage, 1), pageCount);
    setPage(clamped);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resultSummary = useMemo(() => {
    if (filteredColumns.length === 0) {
      return TEXT.noMatching;
    }

    const pieces = [`${"\uCD1D"} ${filteredColumns.length}${TEXT.resultCountSuffix}`];
    if (activeTag) {
      pieces.push(`#${activeTag.label}`);
    }
    if (deferredQuery.trim()) {
      pieces.push(`"${deferredQuery.trim()}" ${TEXT.searchResultsSuffix}`);
    }
    return pieces.join(` ${DOT} `);
  }, [activeTag, deferredQuery, filteredColumns.length]);

  const handleDelete = (deletedPostId: string) => {
    setColumns((prev) => prev.filter((item) => item.postId !== deletedPostId));
  };

  return (
    <section className="min-h-[calc(100vh-7rem)] w-full bg-[radial-gradient(circle_at_top_left,_#d8f6eb_0%,_#f8fafc_40%,_#ffffff_100%)]">
      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10 sm:px-6">
        <header className="overflow-hidden rounded-[2rem] border border-emerald-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(241,253,248,0.97)_48%,rgba(236,253,245,0.9)_100%)] p-6 shadow-[0_24px_55px_-36px_rgba(6,95,70,0.56)] sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.32em] text-emerald-700">
                WELLNESSBOX COLUMN
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-slate-900 sm:text-[2.4rem]">
                {TEXT.heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-[1rem] leading-7 text-slate-700">
                {TEXT.heroBody}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
                    {TEXT.totalPosts}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {columns.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
                    {TEXT.totalTags}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {tags.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/70 bg-white/75 p-4 backdrop-blur">
                  <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">
                    {TEXT.latestPublish}
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-900">
                    {latestPublishedAt ?? TEXT.notReady}
                  </p>
                </div>
              </div>
            </div>

            {featuredColumn ? (
              <Link
                href={`/column/${featuredColumn.slug}`}
                className="block rounded-[1.75rem] border border-slate-200/80 bg-white/80 p-3 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.75)] transition hover:-translate-y-0.5 hover:border-emerald-300"
              >
                <div className="overflow-hidden rounded-[1.3rem] border border-slate-200">
                  <ColumnThumbnail
                    slug={featuredColumn.slug}
                    title={featuredColumn.title}
                    tags={featuredColumn.tags}
                    coverImageUrl={featuredColumn.coverImageUrl}
                    alt={`${featuredColumn.title} ${"\uB300\uD45C \uC774\uBBF8\uC9C0"}`}
                    variant="feature"
                  />
                </div>
                <div className="px-1 pb-1 pt-4">
                  <p className="text-xs font-semibold tracking-[0.18em] text-emerald-700">
                    {TEXT.latestColumn}
                  </p>
                  <p className="mt-2 text-xl font-black leading-snug text-slate-900">
                    {featuredColumn.title}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-700">
                    {featuredColumn.summary}
                  </p>
                </div>
              </Link>
            ) : null}
          </div>
        </header>

        <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-[0_12px_40px_-34px_rgba(15,23,42,0.6)] sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{TEXT.browseSettings}</p>
              <p className="mt-1 text-sm text-slate-600">{TEXT.browseBody}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/column"
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                {TEXT.allList}
              </Link>
              <a
                href="#column-results"
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                {TEXT.jumpToResults}
              </a>
              {isAdmin ? (
                <Link
                  href="/admin/column/editor"
                  data-testid="column-admin-write"
                  className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  {TEXT.writePost}
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.45fr))]">
            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-700">
              <span className="shrink-0 font-semibold text-slate-900">{TEXT.search}</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={TEXT.searchPlaceholder}
                className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>

            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-700">
              <span className="shrink-0 font-semibold text-slate-900">{TEXT.tag}</span>
              <select
                value={selectedTag}
                onChange={(event) => setSelectedTag(event.target.value)}
                className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
              >
                <option value={ALL_TAG}>{TEXT.all}</option>
                {tags.map((tag) => (
                  <option key={tag.slug} value={tag.slug}>
                    {`${tag.label} (${tag.count})`}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-700">
              <span className="shrink-0 font-semibold text-slate-900">{TEXT.view}</span>
              <select
                value={viewMode}
                onChange={(event) => setViewMode(event.target.value as ViewMode)}
                className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
              >
                <option value="grid">{TEXT.cardView}</option>
                <option value="list">{TEXT.listView}</option>
              </select>
            </label>

            <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-700">
              <span className="shrink-0 font-semibold text-slate-900">{TEXT.count}</span>
              <select
                value={String(pageSize)}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={String(option)}>
                    {formatPageSize(option)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2" id="column-tags">
              <button
                type="button"
                onClick={() => setSelectedTag(ALL_TAG)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedTag === ALL_TAG
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {TEXT.all}
              </button>
              {tags.map((tag) => (
                <button
                  key={`tag-${tag.slug}`}
                  type="button"
                  onClick={() => setSelectedTag(tag.slug)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    selectedTag === tag.slug
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  {`#${tag.label} (${tag.count})`}
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section
          id="column-results"
          ref={resultsRef}
          className="mt-8 scroll-mt-24"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-[0.16em] text-emerald-700">
                {TEXT.resultsEyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">
                {TEXT.resultsTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-600">{resultSummary}</p>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600">
              {filteredColumns.length > 0
                ? `${Math.min(startIndex + 1, filteredColumns.length)}-${Math.min(
                    startIndex + pagedColumns.length,
                    filteredColumns.length
                  )} / ${filteredColumns.length}`
                : "0 / 0"}
            </div>
          </div>
        </section>

        {filteredColumns.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white/85 p-10 text-center text-slate-600">
            {columns.length === 0 ? TEXT.emptyNoPosts : TEXT.emptyNoResults}
          </div>
        ) : (
          <>
            <ul
              className={`mt-6 ${
                viewMode === "grid" ? "grid gap-5 lg:grid-cols-2" : "grid gap-4"
              }`}
            >
              {pagedColumns.map((column) => (
                <li key={column.slug}>
                  <ColumnResultCard
                    column={column}
                    isAdmin={isAdmin}
                    viewMode={viewMode}
                    onDeleted={handleDelete}
                    onCardClick={handleCardClick}
                    onCardKeyDown={handleCardKeyDown}
                  />
                </li>
              ))}
            </ul>

            {pageCount > 1 ? (
              <nav
                className="mt-8 flex flex-wrap items-center justify-center gap-2"
                aria-label={`${"\uCE7C\uB7FC"} ${"\uD398\uC774\uC9C0"} ${"\uC774\uB3D9"}`}
              >
                <button
                  type="button"
                  onClick={() => moveToPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {TEXT.previous}
                </button>

                {pageWindow.map((pageNumber, index) => {
                  const previous = pageWindow[index - 1];
                  const hasGap = previous && pageNumber - previous > 1;
                  return (
                    <div key={pageNumber} className="flex items-center gap-2">
                      {hasGap ? (
                        <span className="px-1 text-slate-400" aria-hidden>
                          ...
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => moveToPage(pageNumber)}
                        aria-current={pageNumber === safePage ? "page" : undefined}
                        className={`h-10 min-w-10 rounded-full px-3 text-sm font-semibold transition ${
                          pageNumber === safePage
                            ? "bg-slate-900 text-white"
                            : "border border-slate-300 bg-white text-slate-700 hover:border-emerald-300 hover:text-emerald-700"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => moveToPage(safePage + 1)}
                  disabled={safePage >= pageCount}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {TEXT.next}
                </button>
              </nav>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
