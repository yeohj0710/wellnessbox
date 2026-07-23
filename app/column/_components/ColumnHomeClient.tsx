"use client";

import { useRouter } from "next/navigation";
import {
  type KeyboardEvent,
  type MouseEvent,
  useMemo,
  useRef,
} from "react";
import type { ColumnSummary, ColumnTag } from "../_lib/columns-types";
import {
  ColumnHomeBrowseSection,
  ColumnHomeHeroSection,
  ColumnHomeResultsSection,
} from "./ColumnHomeSections";
import { PAGE_SIZE_OPTIONS, useColumnHomeBrowse } from "./useColumnHomeBrowse";
type ColumnHomeClientProps = {
  initialColumns: ColumnSummary[];
  tags: ColumnTag[];
  isAdmin: boolean;
};

const TEXT = {
  browseSettings: "찾아보기",
  writePost: "글 쓰기",
  search: "검색",
  tag: "태그",
  view: "보기",
  count: "개수",
  all: "전체",
  cardView: "카드형",
  listView: "리스트형",
  searchPlaceholder: "제목, 요약, 태그로 검색",
  clearSearch: "검색어 지우기",
  heroEyebrow: "건강 칼럼",
  heroTitle: "복용과 생활 습관이 헷갈릴 때 천천히 찾아보는 건강 칼럼",
  heroBody: "영양제와 생활 습관 관련 궁금증을 주제별로 정리했어요.",
  latestColumn: "최근 올라온 글",
  readMore: "이어서 읽기",
  tagShelfTitle: "자주 찾는 태그",
  expandTags: "더보기",
  collapseTags: "접기",
  resetFilters: "필터 초기화",
  resultsTitle: "칼럼 목록",
  emptyNoPosts: "등록된 칼럼이 아직 없습니다.",
  emptyNoResults: "조건에 맞는 칼럼이 아직 없어요.",
  previous: "이전",
  next: "다음",
  searchResultsSuffix: "검색",
  resultCountSuffix: "개 글",
  totalPostsSuffix: "개 글",
} as const;

function isCardInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("a,button,input,textarea,select,label,[role='button']")
  );
}

export default function ColumnHomeClient({
  initialColumns,
  tags,
  isAdmin,
}: ColumnHomeClientProps) {
  const router = useRouter();
  const resultsRef = useRef<HTMLElement | null>(null);
  const {
    columns,
    query,
    setQuery,
    selectedTag,
    setSelectedTag,
    viewMode,
    setViewMode,
    pageSize,
    setPageSize,
    showAllTags,
    setShowAllTags,
    deferredQuery,
    filteredColumns,
    featuredColumn,
    activeTag,
    tagGroups,
    pageCount,
    safePage,
    pageWindow,
    startIndex,
    pagedColumns,
    hasActiveFilters,
    resetFilters,
    moveToPage,
    handleDelete,
  } = useColumnHomeBrowse({
    initialColumns,
    tags,
  });

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

  const handleMoveToPage = (nextPage: number) => {
    moveToPage(nextPage);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resultSummary = useMemo(() => {
    const rangeStart = Math.min(startIndex + 1, filteredColumns.length);
    const rangeEnd = Math.min(
      startIndex + pagedColumns.length,
      filteredColumns.length
    );
    const pieces = [
      filteredColumns.length === 0
        ? `총 0${TEXT.resultCountSuffix}`
        : `${rangeStart}-${rangeEnd} / 총 ${filteredColumns.length}${TEXT.resultCountSuffix}`,
    ];
    if (activeTag) {
      pieces.push(`#${activeTag.label}`);
    }
    if (deferredQuery.trim()) {
      pieces.push(`"${deferredQuery.trim()}" ${TEXT.searchResultsSuffix}`);
    }
    return pieces.join(" · ");
  }, [
    activeTag,
    deferredQuery,
    filteredColumns.length,
    pagedColumns.length,
    startIndex,
  ]);

  return (
    <section className="min-h-[calc(100vh-7rem)] w-full bg-[radial-gradient(120%_58%_at_50%_-8%,rgba(209,250,229,0.52)_0%,rgba(248,250,252,0.72)_46%,#ffffff_100%)]">
      <section className="mx-auto w-full max-w-[640px] px-4 pb-24 pt-6 sm:px-6 sm:pt-9 md:max-w-[820px] lg:px-8 xl:max-w-[1120px]">
        <ColumnHomeHeroSection
          featuredColumn={featuredColumn}
          totalCount={columns.length}
          text={TEXT}
        />

        <ColumnHomeBrowseSection
          isAdmin={isAdmin}
          query={query}
          selectedTag={selectedTag}
          viewMode={viewMode}
          showAllTags={showAllTags}
          tagGroups={tagGroups}
          setQuery={setQuery}
          setSelectedTag={setSelectedTag}
          setViewMode={setViewMode}
          setShowAllTags={setShowAllTags}
          text={TEXT}
        />

        <ColumnHomeResultsSection
          resultsRef={resultsRef}
          resultSummary={resultSummary}
          filteredColumns={filteredColumns}
          columnsCount={columns.length}
          pagedColumns={pagedColumns}
          viewMode={viewMode}
          isAdmin={isAdmin}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          hasActiveFilters={hasActiveFilters}
          pageCount={pageCount}
          safePage={safePage}
          pageWindow={pageWindow}
          onPageSizeChange={setPageSize}
          onResetFilters={resetFilters}
          onMoveToPage={handleMoveToPage}
          onDelete={handleDelete}
          onCardClick={handleCardClick}
          onCardKeyDown={handleCardKeyDown}
          text={TEXT}
        />
      </section>
    </section>
  );
}
