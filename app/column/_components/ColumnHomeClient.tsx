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
import { useColumnHomeBrowse } from "./useColumnHomeBrowse";
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
  heroTitle: "복용과 생활 습관이 헷갈릴 때 천천히 찾아보는 건강 칼럼",
  heroBody:
    "영양제와 생활 습관 관련 궁금증을 주제별로 정리했어요.",
  latestColumn: "최근 올라온 글",
  tagShelfTitle: "자주 찾는 태그",
  expandTags: "더보기",
  collapseTags: "접기",
  resultsTitle: "칼럼 목록",
  emptyNoPosts: "등록된 칼럼이 아직 없습니다.",
  emptyNoResults: "검색어나 태그 조건을 조금 넓혀서 다시 찾아보세요.",
  noMatching: "조건에 맞는 칼럼이 아직 없습니다.",
  previous: "이전",
  next: "다음",
  searchResultsSuffix: "검색",
  resultCountSuffix: "개 글",
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
    if (filteredColumns.length === 0) {
      return TEXT.noMatching;
    }

    const pieces = [`총 ${filteredColumns.length}${TEXT.resultCountSuffix}`];
    if (activeTag) {
      pieces.push(`#${activeTag.label}`);
    }
    if (deferredQuery.trim()) {
      pieces.push(`"${deferredQuery.trim()}" ${TEXT.searchResultsSuffix}`);
    }
    return pieces.join(" · ");
  }, [activeTag, deferredQuery, filteredColumns.length]);

  return (
    <section className="min-h-[calc(100vh-7rem)] w-full bg-[radial-gradient(circle_at_top_left,_rgba(220,245,236,0.68)_0%,_#f8fafc_34%,_#ffffff_100%)]">
      <section className="mx-auto w-full max-w-[640px] px-4 pb-20 pt-6 sm:px-6 md:max-w-[760px] sm:pt-10 xl:max-w-[960px]">
        <ColumnHomeHeroSection
          featuredColumn={featuredColumn}
          text={TEXT}
        />

        <ColumnHomeBrowseSection
          tags={tags}
          isAdmin={isAdmin}
          query={query}
          selectedTag={selectedTag}
          viewMode={viewMode}
          pageSize={pageSize}
          showAllTags={showAllTags}
          tagGroups={tagGroups}
          setQuery={setQuery}
          setSelectedTag={setSelectedTag}
          setViewMode={setViewMode}
          setPageSize={setPageSize}
          setShowAllTags={setShowAllTags}
          text={TEXT}
        />

        <ColumnHomeResultsSection
          resultsRef={resultsRef}
          resultSummary={resultSummary}
          filteredColumns={filteredColumns}
          columnsCount={columns.length}
          startIndex={startIndex}
          pagedColumns={pagedColumns}
          viewMode={viewMode}
          isAdmin={isAdmin}
          pageCount={pageCount}
          safePage={safePage}
          pageWindow={pageWindow}
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
