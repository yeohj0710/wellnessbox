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

const DOT = "\u2022";

const TEXT = {
  totalPosts: "전체 글",
  totalTags: "태그 수",
  latestPublish: "최신 발행",
  notReady: "준비 중",
  browseSettings: "찾아보기",
  browseBody:
    "검색어와 태그를 조합해서 지금 필요한 글부터 가볍게 골라보세요.",
  allList: "처음으로",
  jumpToResults: "목록 보기",
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
    "비타민, 오메가3, 유산균처럼 자주 찾는 주제부터 음식-약 상호작용, 생활 습관 이슈까지 차분하게 모아뒀어요. 필요할 때 부담 없이 훑어보고, 궁금한 주제만 골라 읽기 좋게 정리했습니다.",
  latestColumn: "최근 올라온 글",
  tagShelfTitle: "자주 찾는 태그",
  tagShelfBody:
    "자주 보는 주제부터 먼저 두고, 더 세부적인 태그는 아래에서 천천히 펼쳐볼 수 있게 정리했어요.",
  expandTags: "나머지 태그 펼치기",
  collapseTags: "태그 접기",
  longTailTags: "세부 태그",
  resultsEyebrow: "RESULTS",
  resultsTitle: "지금 읽기 좋은 칼럼 목록",
  emptyNoPosts: "등록된 칼럼이 아직 없습니다.",
  emptyNoResults: "검색어나 태그 조건을 조금 넓혀서 다시 찾아보세요.",
  noMatching: "조건에 맞는 칼럼이 아직 없습니다.",
  previous: "이전",
  next: "다음",
  searchResultsSuffix: "검색",
  resultCountSuffix: "개 글",
} as const;

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
    latestColumn,
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

  const latestPublishedAt = latestColumn
    ? formatDate(latestColumn.publishedAt)
    : null;

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
    return pieces.join(` ${DOT} `);
  }, [activeTag, deferredQuery, filteredColumns.length]);

  return (
    <section className="min-h-[calc(100vh-7rem)] w-full bg-[radial-gradient(circle_at_top_left,_rgba(220,245,236,0.68)_0%,_#f8fafc_34%,_#ffffff_100%)]">
      <div className="mx-auto w-full max-w-[1120px] px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <ColumnHomeHeroSection
          columnsCount={columns.length}
          tagsCount={tags.length}
          latestPublishedAt={latestPublishedAt}
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
      </div>
    </section>
  );
}
