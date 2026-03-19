"use client";

import Link from "next/link";
import type { KeyboardEvent, MouseEvent, RefObject } from "react";
import type { ColumnSummary, ColumnTag } from "../_lib/columns-types";
import ColumnAdminActions from "./ColumnAdminActions";
import ColumnThumbnail from "./ColumnThumbnail";
import { ALL_TAG, normalizeTagSlugClient, type ViewMode } from "./useColumnHomeBrowse";

const CARD_TAG_PREVIEW_LIMIT = 3;
const DOT = "\u2022";

type ColumnHomeText = {
  totalPosts: string;
  totalTags: string;
  latestPublish: string;
  notReady: string;
  browseSettings: string;
  browseBody: string;
  allList: string;
  jumpToResults: string;
  writePost: string;
  search: string;
  tag: string;
  view: string;
  count: string;
  all: string;
  cardView: string;
  listView: string;
  searchPlaceholder: string;
  heroTitle: string;
  heroBody: string;
  latestColumn: string;
  tagShelfTitle: string;
  tagShelfBody: string;
  expandTags: string;
  collapseTags: string;
  longTailTags: string;
  resultsEyebrow: string;
  resultsTitle: string;
  emptyNoPosts: string;
  emptyNoResults: string;
  previous: string;
  next: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function buildClampStyle(lines: number) {
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical" as const,
    overflow: "hidden",
  };
}

function formatPageSize(value: number, text: ColumnHomeText) {
  return value >= 1000000 ? text.all : `${value}개`;
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
  const previewTags = column.tags.slice(0, CARD_TAG_PREVIEW_LIMIT);
  const hiddenTagCount = Math.max(0, column.tags.length - previewTags.length);

  return (
    <article
      data-testid="column-card"
      data-post-id={column.postId ?? ""}
      role="link"
      tabIndex={0}
      onClick={(event) => onCardClick(event, column.slug)}
      onKeyDown={(event) => onCardKeyDown(event, column.slug)}
      className={`group cursor-pointer overflow-hidden rounded-[1.5rem] border border-slate-200/90 bg-white/96 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_38px_-30px_rgba(15,23,42,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 ${
        isList ? "p-3 sm:p-4" : "p-4 sm:p-5"
      }`}
    >
      <div className={isList ? "grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]" : ""}>
        <div className={isList ? "overflow-hidden rounded-[1.35rem] border border-slate-200" : ""}>
          <ColumnThumbnail
            slug={column.slug}
            title={column.title}
            tags={column.tags}
            coverImageUrl={column.coverImageUrl}
            alt={`${column.title} 썸네일`}
            variant={isList ? "list" : "card"}
          />
        </div>

        <div className={isList ? "min-w-0" : "mt-4"}>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
            <time dateTime={column.publishedAt}>{formatDate(column.publishedAt)}</time>
            <span aria-hidden>{DOT}</span>
            <span>{`약 ${column.readingMinutes}분`}</span>
            {column.tags[0] ? (
              <>
                <span aria-hidden>{DOT}</span>
                <span className="text-emerald-700">{column.tags[0]}</span>
              </>
            ) : null}
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h2
              className="min-w-0 text-[1.02rem] font-bold leading-snug text-slate-900 sm:text-[1.25rem]"
              style={buildClampStyle(isList ? 2 : 3)}
            >
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

          <p
            className="mt-3 text-sm leading-6 text-slate-700 sm:text-[0.96rem] sm:leading-7"
            style={buildClampStyle(isList ? 3 : 4)}
          >
            {column.summary}
          </p>

          {previewTags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {previewTags.map((tag) => (
                <Link
                  key={`${column.slug}-${tag}`}
                  href={`/column/tag/${normalizeTagSlugClient(tag)}`}
                  className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                >
                  #{tag}
                </Link>
              ))}
              {hiddenTagCount > 0 ? (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
                  +{hiddenTagCount}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ColumnHomeHeroSection({
  columnsCount,
  tagsCount,
  latestPublishedAt,
  featuredColumn,
  text,
}: {
  columnsCount: number;
  tagsCount: number;
  latestPublishedAt: string | null;
  featuredColumn: ColumnSummary | null;
  text: ColumnHomeText;
}) {
  return (
    <header className="overflow-hidden rounded-[1.6rem] border border-emerald-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.97)_0%,rgba(248,253,250,0.98)_52%,rgba(243,251,248,0.94)_100%)] p-5 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.34)] sm:rounded-[1.8rem] sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.34fr)_minmax(220px,0.5fr)] lg:items-start xl:grid-cols-[minmax(0,1.42fr)_248px]">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.28em] text-emerald-700">
            WELLNESSBOX COLUMN
          </p>
          <h1 className="mt-3 max-w-[15ch] text-[1.72rem] font-black leading-[1.08] text-slate-900 sm:max-w-[16ch] sm:text-[1.96rem]">
            {text.heroTitle}
          </h1>
          <p className="mt-4 max-w-[34rem] text-sm leading-6 text-slate-700 sm:text-[0.96rem] sm:leading-7">
            {text.heroBody}
          </p>

          <div className="mt-6 grid grid-cols-3 gap-2.5 sm:max-w-[27rem] sm:gap-3">
            <div className="rounded-[1.2rem] border border-white/80 bg-white/82 p-3 backdrop-blur sm:rounded-[1.35rem] sm:p-4">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">
                {text.totalPosts}
              </p>
              <p className="mt-1.5 text-xl font-black text-slate-900 sm:text-[1.65rem]">
                {columnsCount}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-white/80 bg-white/82 p-3 backdrop-blur sm:rounded-[1.35rem] sm:p-4">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">
                {text.totalTags}
              </p>
              <p className="mt-1.5 text-xl font-black text-slate-900 sm:text-[1.65rem]">
                {tagsCount}
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-white/80 bg-white/82 p-3 backdrop-blur sm:rounded-[1.35rem] sm:p-4">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">
                {text.latestPublish}
              </p>
              <p className="mt-1.5 text-xs font-bold leading-5 text-slate-900 sm:text-sm">
                {latestPublishedAt ?? text.notReady}
              </p>
            </div>
          </div>
        </div>

        {featuredColumn ? (
          <Link
            href={`/column/${featuredColumn.slug}`}
            className="block rounded-[1.2rem] border border-slate-200/85 bg-white/88 p-2 shadow-[0_16px_36px_-32px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 hover:border-emerald-300 sm:rounded-[1.35rem] lg:mt-2 lg:max-w-[280px] lg:justify-self-end"
          >
            <div className="overflow-hidden rounded-[0.95rem] border border-slate-200">
              <ColumnThumbnail
                slug={featuredColumn.slug}
                title={featuredColumn.title}
                tags={featuredColumn.tags}
                coverImageUrl={featuredColumn.coverImageUrl}
                alt={`${featuredColumn.title} 대표 이미지`}
                variant="feature"
              />
            </div>
            <div className="px-1 pb-1 pt-2">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-emerald-700">
                {text.latestColumn}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                {formatDate(featuredColumn.publishedAt)}
              </p>
              <p
                className="mt-1.5 text-[0.95rem] font-black leading-[1.38] text-slate-900 sm:text-[1.05rem]"
                style={buildClampStyle(2)}
              >
                {featuredColumn.title}
              </p>
              <p
                className="mt-1.5 text-[12px] leading-5 text-slate-700"
                style={buildClampStyle(2)}
              >
                {featuredColumn.summary}
              </p>
            </div>
          </Link>
        ) : null}
      </div>
    </header>
  );
}

export function ColumnHomeBrowseSection({
  tags,
  isAdmin,
  query,
  selectedTag,
  viewMode,
  pageSize,
  showAllTags,
  tagGroups,
  setQuery,
  setSelectedTag,
  setViewMode,
  setPageSize,
  setShowAllTags,
  text,
}: {
  tags: ColumnTag[];
  isAdmin: boolean;
  query: string;
  selectedTag: string;
  viewMode: ViewMode;
  pageSize: number;
  showAllTags: boolean;
  tagGroups: {
    hidden: ColumnTag[];
    visible: ColumnTag[];
  };
  setQuery: (value: string) => void;
  setSelectedTag: (value: string) => void;
  setViewMode: (value: ViewMode) => void;
  setPageSize: (value: number) => void;
  setShowAllTags: (updater: (previous: boolean) => boolean) => void;
  text: ColumnHomeText;
}) {
  return (
    <section className="mt-6 rounded-[1.55rem] border border-slate-200 bg-white/95 p-4 shadow-[0_12px_36px_-34px_rgba(15,23,42,0.28)] sm:rounded-[1.75rem] sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">{text.browseSettings}</p>
          <p className="mt-1 text-sm text-slate-600">{text.browseBody}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/column"
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            {text.allList}
          </Link>
          <a
            href="#column-results"
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            {text.jumpToResults}
          </a>
          {isAdmin ? (
            <Link
              href="/admin/column/editor"
              data-testid="column-admin-write"
              className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              {text.writePost}
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_repeat(3,minmax(0,0.48fr))]">
        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-700">
          <span className="shrink-0 font-semibold text-slate-900">{text.search}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text.searchPlaceholder}
            className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </label>

        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-700">
          <span className="shrink-0 font-semibold text-slate-900">{text.tag}</span>
          <select
            value={selectedTag}
            onChange={(event) => setSelectedTag(event.target.value)}
            className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
          >
            <option value={ALL_TAG}>{text.all}</option>
            {tags.map((tag) => (
              <option key={tag.slug} value={tag.slug}>
                {`${tag.label} (${tag.count})`}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-700">
          <span className="shrink-0 font-semibold text-slate-900">{text.view}</span>
          <select
            value={viewMode}
            onChange={(event) => setViewMode(event.target.value as ViewMode)}
            className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
          >
            <option value="grid">{text.cardView}</option>
            <option value="list">{text.listView}</option>
          </select>
        </label>

        <label className="flex min-h-12 items-center gap-3 rounded-2xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-700">
          <span className="shrink-0 font-semibold text-slate-900">{text.count}</span>
          <select
            value={String(pageSize)}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
          >
            {[12, 24, 48, 1000000].map((option) => (
              <option key={option} value={String(option)}>
                {formatPageSize(option, text)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tags.length > 0 ? (
        <div
          className="mt-5 rounded-[1.3rem] border border-slate-200 bg-slate-50/80 p-4"
          id="column-tags"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{text.tagShelfTitle}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {text.tagShelfBody}
                {tagGroups.hidden.length > 0
                  ? ` ${text.longTailTags} ${tagGroups.hidden.length}개`
                  : ""}
              </p>
            </div>
            {tagGroups.hidden.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllTags((prev) => !prev)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                {showAllTags
                  ? text.collapseTags
                  : `${text.expandTags} ${tagGroups.hidden.length}개`}
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTag(ALL_TAG)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                selectedTag === ALL_TAG
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
              }`}
            >
              {text.all}
            </button>
            {tagGroups.visible.map((tag) => (
              <button
                key={`tag-${tag.slug}`}
                type="button"
                onClick={() => setSelectedTag(tag.slug)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedTag === tag.slug
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                }`}
              >
                {`#${tag.label} (${tag.count})`}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function ColumnHomeResultsSection({
  resultsRef,
  resultSummary,
  filteredColumns,
  columnsCount,
  startIndex,
  pagedColumns,
  viewMode,
  isAdmin,
  pageCount,
  safePage,
  pageWindow,
  onMoveToPage,
  onDelete,
  onCardClick,
  onCardKeyDown,
  text,
}: {
  resultsRef: RefObject<HTMLElement | null>;
  resultSummary: string;
  filteredColumns: ColumnSummary[];
  columnsCount: number;
  startIndex: number;
  pagedColumns: ColumnSummary[];
  viewMode: ViewMode;
  isAdmin: boolean;
  pageCount: number;
  safePage: number;
  pageWindow: number[];
  onMoveToPage: (nextPage: number) => void;
  onDelete: (deletedPostId: string) => void;
  onCardClick: (event: MouseEvent<HTMLElement>, slug: string) => void;
  onCardKeyDown: (event: KeyboardEvent<HTMLElement>, slug: string) => void;
  text: ColumnHomeText;
}) {
  return (
    <>
      <section
        id="column-results"
        ref={resultsRef as RefObject<HTMLElement>}
        className="mt-8 scroll-mt-24"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.12em] text-emerald-700">
              {text.resultsEyebrow}
            </p>
            <h2 className="mt-2 text-[1.6rem] font-black text-slate-900">
              {text.resultsTitle}
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
          {columnsCount === 0 ? text.emptyNoPosts : text.emptyNoResults}
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
                  onDeleted={onDelete}
                  onCardClick={onCardClick}
                  onCardKeyDown={onCardKeyDown}
                />
              </li>
            ))}
          </ul>

          {pageCount > 1 ? (
            <nav
              className="mt-8 flex flex-wrap items-center justify-center gap-2"
              aria-label="칼럼 페이지 이동"
            >
              <button
                type="button"
                onClick={() => onMoveToPage(safePage - 1)}
                disabled={safePage <= 1}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {text.previous}
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
                      onClick={() => onMoveToPage(pageNumber)}
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
                onClick={() => onMoveToPage(safePage + 1)}
                disabled={safePage >= pageCount}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {text.next}
              </button>
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}
