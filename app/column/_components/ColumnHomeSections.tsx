"use client";

import Link from "next/link";
import type { KeyboardEvent, MouseEvent, RefObject } from "react";
import type { ColumnSummary, ColumnTag } from "../_lib/columns-types";
import ColumnAdminActions from "./ColumnAdminActions";
import ColumnThumbnail from "./ColumnThumbnail";
import { ALL_TAG, normalizeTagSlugClient, type ViewMode } from "./useColumnHomeBrowse";

const CARD_TAG_PREVIEW_LIMIT = 3;
const DOT = "•";

type ColumnHomeText = {
  browseSettings: string;
  writePost: string;
  search: string;
  view: string;
  count: string;
  all: string;
  cardView: string;
  listView: string;
  searchPlaceholder: string;
  clearSearch: string;
  heroEyebrow: string;
  heroTitle: string;
  heroBody: string;
  latestColumn: string;
  readMore: string;
  collapseTags: string;
  resetFilters: string;
  resultsTitle: string;
  emptyNoPosts: string;
  emptyNoResults: string;
  previous: string;
  next: string;
  totalPostsSuffix: string;
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

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replace(/\s/g, "")
    .replace(/\.$/, "");
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
  return value >= 1000000 ? text.all : `${value}개씩`;
}

function normalizeSummary(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <circle cx="9" cy="9" r="5.4" />
      <path d="m13.2 13.2 3.3 3.3" />
    </svg>
  );
}

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="m6 6 8 8M14 6l-8 8" />
    </svg>
  );
}

function GridViewIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <rect x="2.6" y="2.6" width="6.2" height="6.2" rx="1.7" />
      <rect x="11.2" y="2.6" width="6.2" height="6.2" rx="1.7" />
      <rect x="2.6" y="11.2" width="6.2" height="6.2" rx="1.7" />
      <rect x="11.2" y="11.2" width="6.2" height="6.2" rx="1.7" />
    </svg>
  );
}

function ListViewIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <rect x="2.6" y="3.4" width="5" height="5" rx="1.5" />
      <rect x="2.6" y="11.6" width="5" height="5" rx="1.5" />
      <rect x="9.4" y="4.4" width="8" height="1.8" rx="0.9" />
      <rect x="9.4" y="7.4" width="5.6" height="1.6" rx="0.8" />
      <rect x="9.4" y="12.6" width="8" height="1.8" rx="0.9" />
      <rect x="9.4" y="15.6" width="5.6" height="1.6" rx="0.8" />
    </svg>
  );
}

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4.5 10h11M11 5.5 15.5 10 11 14.5" />
    </svg>
  );
}

function TagChip({ label }: { label: string }) {
  return (
    <Link
      href={`/column/tag/${normalizeTagSlugClient(label)}`}
      className="rounded-md bg-slate-100 px-2 py-1 text-[0.7rem] font-semibold text-slate-500 transition hover:bg-emerald-100 hover:text-emerald-800 group-hover:bg-emerald-50 group-hover:text-emerald-700"
    >
      #{label}
    </Link>
  );
}

function ColumnCardMeta({
  publishedAt,
  readingMinutes,
  compact = false,
}: {
  publishedAt: string;
  readingMinutes: number;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 text-[0.72rem] font-semibold tracking-tight text-slate-400">
      <time dateTime={publishedAt}>
        {compact ? formatShortDate(publishedAt) : formatDate(publishedAt)}
      </time>
      <span aria-hidden>{DOT}</span>
      <span>{`약 ${readingMinutes}분`}</span>
    </div>
  );
}

function ColumnCardTags({ tags }: { tags: string[] }) {
  const previewTags = tags.slice(0, CARD_TAG_PREVIEW_LIMIT);
  const hiddenTagCount = Math.max(0, tags.length - previewTags.length);
  if (previewTags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {previewTags.map((tag) => (
        <TagChip key={tag} label={tag} />
      ))}
      {hiddenTagCount > 0 ? (
        <span className="text-[0.7rem] font-semibold text-slate-400">
          +{hiddenTagCount}
        </span>
      ) : null}
    </div>
  );
}

const CARD_SHELL_CLASS =
  "group relative cursor-pointer overflow-hidden border border-slate-200 bg-white transition duration-200 hover:border-emerald-300 hover:shadow-[0_22px_44px_-32px_rgba(15,23,42,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2";

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
  const summary = normalizeSummary(column.summary);

  if (viewMode === "list") {
    return (
      <article
        data-testid="column-card"
        data-post-id={column.postId ?? ""}
        role="link"
        tabIndex={0}
        onClick={(event) => onCardClick(event, column.slug)}
        onKeyDown={(event) => onCardKeyDown(event, column.slug)}
        className={`${CARD_SHELL_CLASS} flex gap-3.5 rounded-[1.15rem] p-3 sm:gap-5 sm:p-4`}
      >
        <div className="relative w-[112px] shrink-0 self-stretch overflow-hidden rounded-[0.85rem] sm:w-[184px] md:w-[216px]">
          <div className="absolute inset-0">
            <ColumnThumbnail
              slug={column.slug}
              title={column.title}
              tags={column.tags}
              coverImageUrl={column.coverImageUrl}
              alt={`${column.title} 썸네일`}
              variant="list"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <ColumnCardMeta
            publishedAt={column.publishedAt}
            readingMinutes={column.readingMinutes}
            compact
          />

          <h2
            className="mt-1.5 min-w-0 text-[0.95rem] font-bold leading-[1.45] tracking-[-0.01em] text-slate-900 sm:text-[1.12rem]"
            style={buildClampStyle(2)}
          >
            <Link
              href={`/column/${column.slug}`}
              className="transition group-hover:text-emerald-700"
            >
              {column.title}
            </Link>
          </h2>

          <p
            className="mt-1.5 hidden text-[0.85rem] leading-6 text-slate-500 sm:block"
            style={buildClampStyle(2)}
          >
            {summary}
          </p>

          <div className="mt-2">
            <ColumnCardTags tags={column.tags} />
          </div>

          {isAdmin ? (
            <ColumnAdminActions
              className="mt-3"
              postId={column.postId}
              title={column.title}
              onDeleted={onDeleted}
            />
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <article
      data-testid="column-card"
      data-post-id={column.postId ?? ""}
      role="link"
      tabIndex={0}
      onClick={(event) => onCardClick(event, column.slug)}
      onKeyDown={(event) => onCardKeyDown(event, column.slug)}
      className={`${CARD_SHELL_CLASS} flex h-full flex-col rounded-[1.25rem] hover:-translate-y-1`}
    >
      <div className="overflow-hidden border-b border-slate-100">
        <ColumnThumbnail
          slug={column.slug}
          title={column.title}
          tags={column.tags}
          coverImageUrl={column.coverImageUrl}
          alt={`${column.title} 썸네일`}
          variant="card"
        />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <ColumnCardMeta
          publishedAt={column.publishedAt}
          readingMinutes={column.readingMinutes}
        />

        <h2
          className="mt-2 min-w-0 text-[1.02rem] font-bold leading-[1.45] tracking-[-0.01em] text-slate-900 sm:text-[1.08rem]"
          style={buildClampStyle(2)}
        >
          <Link
            href={`/column/${column.slug}`}
            className="transition group-hover:text-emerald-700"
          >
            {column.title}
          </Link>
        </h2>

        <p
          className="mt-2 text-[0.85rem] leading-6 text-slate-500"
          style={buildClampStyle(2)}
        >
          {summary}
        </p>

        <div className="mt-auto pt-4">
          <ColumnCardTags tags={column.tags} />
        </div>

        {isAdmin ? (
          <ColumnAdminActions
            className="mt-3 border-t border-slate-100 pt-3"
            postId={column.postId}
            title={column.title}
            onDeleted={onDeleted}
          />
        ) : null}
      </div>
    </article>
  );
}

export function ColumnHomeHeroSection({
  featuredColumn,
  totalCount,
  text,
}: {
  featuredColumn: ColumnSummary | null;
  totalCount: number;
  text: ColumnHomeText;
}) {
  return (
    <header className="pt-1">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-emerald-600/10 px-2.5 text-[0.68rem] font-bold tracking-[0.14em] text-emerald-700">
          {text.heroEyebrow}
        </span>
        <span className="h-px flex-1 bg-slate-200" aria-hidden />
        <span className="shrink-0 text-[0.72rem] font-semibold text-slate-400">
          {`${totalCount}${text.totalPostsSuffix}`}
        </span>
      </div>

      <h1 className="mt-4 max-w-[22ch] text-[1.68rem] font-black leading-[1.28] tracking-[-0.025em] text-slate-900 sm:text-[2.05rem] sm:leading-[1.24] lg:text-[2.3rem]">
        {text.heroTitle}
      </h1>
      <p className="mt-3 max-w-[38rem] text-[0.92rem] leading-7 text-slate-500 sm:text-[0.98rem]">
        {text.heroBody}
      </p>

      {featuredColumn ? (
        <Link
          href={`/column/${featuredColumn.slug}`}
          className="group mt-5 grid overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_18px_44px_-34px_rgba(15,23,42,0.45)] transition duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-[0_28px_52px_-32px_rgba(15,23,42,0.5)] sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] sm:items-stretch"
        >
          <div className="relative min-h-[10.5rem] overflow-hidden sm:min-h-[14.5rem]">
            <div className="absolute inset-0">
              <ColumnThumbnail
                slug={featuredColumn.slug}
                title={featuredColumn.title}
                tags={featuredColumn.tags}
                coverImageUrl={featuredColumn.coverImageUrl}
                alt={`${featuredColumn.title} 대표 이미지`}
                variant="feature"
              />
            </div>
            <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full bg-slate-900/85 px-2.5 py-1 text-[0.68rem] font-bold tracking-tight text-white backdrop-blur-sm">
              {text.latestColumn}
            </span>
          </div>

          <div className="flex flex-col justify-center gap-2 p-4 sm:p-6 lg:p-7">
            <ColumnCardMeta
              publishedAt={featuredColumn.publishedAt}
              readingMinutes={featuredColumn.readingMinutes}
            />
            <h2
              className="text-[1.18rem] font-black leading-[1.38] tracking-[-0.02em] text-slate-900 transition group-hover:text-emerald-700 sm:text-[1.42rem]"
              style={buildClampStyle(3)}
            >
              {featuredColumn.title}
            </h2>
            <p
              className="text-[0.88rem] leading-6 text-slate-500"
              style={buildClampStyle(2)}
            >
              {normalizeSummary(featuredColumn.summary)}
            </p>
            <span className="mt-1 inline-flex items-center gap-1.5 text-[0.85rem] font-bold text-emerald-700">
              {text.readMore}
              <ArrowIcon className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </div>
        </Link>
      ) : null}
    </header>
  );
}

export function ColumnHomeBrowseSection({
  isAdmin,
  query,
  selectedTag,
  viewMode,
  showAllTags,
  tagGroups,
  setQuery,
  setSelectedTag,
  setViewMode,
  setShowAllTags,
  text,
}: {
  isAdmin: boolean;
  query: string;
  selectedTag: string;
  viewMode: ViewMode;
  showAllTags: boolean;
  tagGroups: {
    hidden: ColumnTag[];
    visible: ColumnTag[];
  };
  setQuery: (value: string) => void;
  setSelectedTag: (value: string) => void;
  setViewMode: (value: ViewMode) => void;
  setShowAllTags: (updater: (previous: boolean) => boolean) => void;
  text: ColumnHomeText;
}) {
  const hasHiddenTags = tagGroups.hidden.length > 0;

  const chipClass = (isActive: boolean, isNeutral = false) =>
    `shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.78rem] font-semibold transition ${
      isActive
        ? isNeutral
          ? "bg-slate-900 text-white"
          : "bg-emerald-600 text-white"
        : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
    }`;

  return (
    <section
      aria-label={text.browseSettings}
      className="mt-7 rounded-[1.25rem] border border-slate-200/90 bg-white/85 p-2.5 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-3"
    >
      <div className="flex items-center gap-2">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 px-3.5 transition focus-within:border-emerald-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-100">
          <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="sr-only">{text.search}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text.searchPlaceholder}
            className="min-w-0 flex-1 border-none bg-transparent text-[0.9rem] text-slate-800 outline-none placeholder:text-slate-400"
          />
          {query ? (
            <button
              type="button"
              aria-label={text.clearSearch}
              onClick={() => setQuery("")}
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-slate-300 text-white transition hover:bg-slate-400"
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          ) : null}
        </label>

        <div
          role="group"
          aria-label={text.view}
          className="flex shrink-0 items-center gap-0.5 rounded-full border border-slate-200 bg-slate-50/90 p-1"
        >
          <button
            type="button"
            aria-label={text.cardView}
            aria-pressed={viewMode === "grid"}
            onClick={() => setViewMode("grid")}
            className={`grid h-8 w-8 place-items-center rounded-full transition ${
              viewMode === "grid"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <GridViewIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={text.listView}
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
            className={`grid h-8 w-8 place-items-center rounded-full transition ${
              viewMode === "list"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <ListViewIcon className="h-4 w-4" />
          </button>
        </div>

        {isAdmin ? (
          <Link
            href="/admin/column/editor"
            data-testid="column-admin-write"
            className="shrink-0 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-2 text-[0.78rem] font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            {text.writePost}
          </Link>
        ) : null}
      </div>

      {tagGroups.visible.length > 0 ? (
        <div className="mt-2 flex items-start gap-2" id="column-tags">
          <div className="relative min-w-0 flex-1">
            <div
              className={
                showAllTags
                  ? "flex max-h-[13rem] flex-wrap gap-1.5 overflow-y-auto pr-1"
                  : "flex gap-1.5 overflow-x-auto pb-0.5 pr-8 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              }
            >
              <button
                type="button"
                onClick={() => setSelectedTag(ALL_TAG)}
                className={chipClass(selectedTag === ALL_TAG, true)}
              >
                {text.all}
              </button>
              {tagGroups.visible.map((tag) => (
                <button
                  key={`tag-${tag.slug}`}
                  type="button"
                  onClick={() => setSelectedTag(tag.slug)}
                  className={chipClass(selectedTag === tag.slug)}
                >
                  {`#${tag.label}`}
                </button>
              ))}
            </div>
            {showAllTags ? null : (
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-white via-white/85 to-transparent"
                aria-hidden
              />
            )}
          </div>

          {hasHiddenTags ? (
            <button
              type="button"
              onClick={() => setShowAllTags((prev) => !prev)}
              aria-expanded={showAllTags}
              className="shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-slate-500 transition hover:border-emerald-200 hover:text-emerald-700"
            >
              {showAllTags ? text.collapseTags : `+${tagGroups.hidden.length}`}
            </button>
          ) : null}
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
  pagedColumns,
  viewMode,
  isAdmin,
  pageSize,
  pageSizeOptions,
  hasActiveFilters,
  pageCount,
  safePage,
  pageWindow,
  onPageSizeChange,
  onResetFilters,
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
  pagedColumns: ColumnSummary[];
  viewMode: ViewMode;
  isAdmin: boolean;
  pageSize: number;
  pageSizeOptions: readonly number[];
  hasActiveFilters: boolean;
  pageCount: number;
  safePage: number;
  pageWindow: number[];
  onPageSizeChange: (value: number) => void;
  onResetFilters: () => void;
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
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="min-w-0">
            <h2 className="text-[1.28rem] font-black tracking-[-0.02em] text-slate-900 sm:text-[1.45rem]">
              {text.resultsTitle}
            </h2>
            <p className="mt-1 text-[0.82rem] font-medium text-slate-500">
              {resultSummary}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.76rem] font-semibold text-slate-500 transition hover:border-rose-200 hover:text-rose-600"
              >
                <CloseIcon className="h-3 w-3" />
                {text.resetFilters}
              </button>
            ) : null}
            <label className="inline-flex items-center rounded-full border border-slate-200 bg-white pl-3 pr-1.5 text-[0.76rem] font-semibold text-slate-500">
              <span className="sr-only">{text.count}</span>
              <select
                value={String(pageSize)}
                onChange={(event) => onPageSizeChange(Number(event.target.value))}
                className="cursor-pointer border-none bg-transparent py-1.5 pr-1 text-[0.76rem] font-semibold text-slate-500 outline-none"
              >
                {pageSizeOptions.map((option) => (
                  <option key={option} value={String(option)}>
                    {formatPageSize(option, text)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {filteredColumns.length === 0 ? (
        <div className="mt-6 rounded-[1.4rem] border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
          <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-400">
            <SearchIcon className="h-5 w-5" />
          </div>
          <p className="mt-4 text-[0.92rem] font-semibold text-slate-700">
            {columnsCount === 0 ? text.emptyNoPosts : text.emptyNoResults}
          </p>
          {columnsCount > 0 && hasActiveFilters ? (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-5 rounded-full bg-slate-900 px-4 py-2 text-[0.82rem] font-semibold text-white transition hover:bg-slate-800"
            >
              {text.resetFilters}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <ul
            className={`mt-5 ${
              viewMode === "grid"
                ? "grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3"
                : "grid gap-3"
            }`}
          >
            {pagedColumns.map((column) => (
              <li key={column.slug} className="min-w-0">
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
              className="mt-10 flex flex-wrap items-center justify-center gap-1.5"
              aria-label="칼럼 페이지 이동"
            >
              <button
                type="button"
                onClick={() => onMoveToPage(safePage - 1)}
                disabled={safePage <= 1}
                className="h-9 rounded-full border border-slate-200 bg-white px-3.5 text-[0.8rem] font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {text.previous}
              </button>

              {pageWindow.map((pageNumber, index) => {
                const previous = pageWindow[index - 1];
                const hasGap = previous && pageNumber - previous > 1;
                return (
                  <div key={pageNumber} className="flex items-center gap-1.5">
                    {hasGap ? (
                      <span className="px-0.5 text-slate-300" aria-hidden>
                        ...
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onMoveToPage(pageNumber)}
                      aria-current={pageNumber === safePage ? "page" : undefined}
                      className={`h-9 min-w-9 rounded-full px-3 text-[0.8rem] font-semibold transition ${
                        pageNumber === safePage
                          ? "bg-slate-900 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
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
                className="h-9 rounded-full border border-slate-200 bg-white px-3.5 text-[0.8rem] font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-35"
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
