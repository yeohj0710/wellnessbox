"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { ColumnSummary, ColumnTag } from "../_lib/columns-types";

export type ViewMode = "grid" | "list";

export const ALL_TAG = "__all__";
export const PAGE_SIZE_OPTIONS = [12, 24, 48, 1000000] as const;

const PRIMARY_TAG_LIMIT = 12;

export function normalizeTagSlugClient(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
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

export function useColumnHomeBrowse(input: {
  initialColumns: ColumnSummary[];
  tags: ColumnTag[];
}) {
  const { initialColumns, tags } = input;
  const [columns, setColumns] = useState(initialColumns);
  const [query, setQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(ALL_TAG);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [pageSize, setPageSize] = useState<number>(12);
  const [page, setPage] = useState(1);
  const [showAllTags, setShowAllTags] = useState(false);
  const deferredQuery = useDeferredValue(query);

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
  const latestColumn = columns[0] ?? null;
  const activeTag = tags.find((tag) => tag.slug === selectedTag) ?? null;
  const tagGroups = useMemo(() => {
    const activeTags = activeTag ? [activeTag] : [];
    const highSignalTags = tags.filter((tag) => tag.count > 1);
    const preferredTags = (highSignalTags.length > 0 ? highSignalTags : tags).filter(
      (tag) => tag.slug !== activeTag?.slug
    );
    const primary = [...activeTags, ...preferredTags].slice(0, PRIMARY_TAG_LIMIT);
    const primarySlugs = new Set(primary.map((tag) => tag.slug));
    const hidden = tags.filter((tag) => !primarySlugs.has(tag.slug));
    return {
      primary,
      hidden,
      visible: showAllTags ? [...primary, ...hidden] : primary,
    };
  }, [activeTag, showAllTags, tags]);
  const pageCount = Math.max(1, Math.ceil(filteredColumns.length / Math.max(1, pageSize)));
  const safePage = Math.min(page, pageCount);
  const pageWindow = buildPageWindow(safePage, pageCount);
  const startIndex = (safePage - 1) * pageSize;
  const pagedColumns =
    pageSize >= 1000000
      ? filteredColumns
      : filteredColumns.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [deferredQuery, selectedTag, pageSize]);

  useEffect(() => {
    if (page <= pageCount) return;
    setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    setShowAllTags(false);
  }, [selectedTag]);

  const moveToPage = (nextPage: number) => {
    setPage(Math.min(Math.max(nextPage, 1), pageCount));
  };

  const handleDelete = (deletedPostId: string) => {
    setColumns((prev) => prev.filter((item) => item.postId !== deletedPostId));
  };

  return {
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
  };
}
