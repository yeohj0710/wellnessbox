import {
  normalizeSlug,
  normalizeTagSlug,
} from "./columns-content-utils";
import type { ColumnSummary, ColumnTag } from "./columns-types";

export function collectColumnTags(columns: ColumnSummary[]): ColumnTag[] {
  const counter = new Map<string, ColumnTag>();

  for (const column of columns) {
    for (const tag of column.tags) {
      const slug = normalizeTagSlug(tag);
      if (!slug) continue;

      const existing = counter.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        counter.set(slug, {
          label: tag,
          slug,
          count: 1,
        });
      }
    }
  }

  return [...counter.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko")
  );
}

export function resolveColumnsByTagSlug(
  columns: ColumnSummary[],
  tagSlug: string
): { tag: ColumnTag | null; columns: ColumnSummary[] } {
  const normalized = normalizeTagSlug(tagSlug);
  if (!normalized) {
    return { tag: null, columns: [] };
  }

  const allTags = collectColumnTags(columns);
  const tag = allTags.find((item) => item.slug === normalized) ?? null;
  if (!tag) {
    return { tag: null, columns: [] };
  }

  const tagged = columns.filter((column) =>
    column.tags.some((rawTag) => normalizeTagSlug(rawTag) === normalized)
  );
  return { tag, columns: tagged };
}

export function selectRelatedColumnSummaries(
  columns: ColumnSummary[],
  slug: string,
  limit = 3
): ColumnSummary[] {
  const normalized = normalizeSlug(slug);
  if (!normalized || limit <= 0) return [];

  const current = columns.find((column) => column.slug === normalized);
  if (!current) return [];

  const currentTagSlugs = new Set(
    current.tags.map((tag) => normalizeTagSlug(tag)).filter(Boolean)
  );

  return columns
    .filter((column) => column.slug !== normalized)
    .map((column) => {
      const sharedTagCount = column.tags.reduce((count, rawTag) => {
        const tagSlug = normalizeTagSlug(rawTag);
        return currentTagSlugs.has(tagSlug) ? count + 1 : count;
      }, 0);
      return { column, sharedTagCount };
    })
    .sort((a, b) => {
      if (a.sharedTagCount !== b.sharedTagCount) {
        return b.sharedTagCount - a.sharedTagCount;
      }
      return (
        new Date(b.column.publishedAt).getTime() -
        new Date(a.column.publishedAt).getTime()
      );
    })
    .slice(0, limit)
    .map((item) => item.column);
}

export function selectAdjacentColumnSummaries(
  columns: ColumnSummary[],
  slug: string
): {
  previous: ColumnSummary | null;
  next: ColumnSummary | null;
} {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    return { previous: null, next: null };
  }

  const currentIndex = columns.findIndex((column) => column.slug === normalized);
  if (currentIndex < 0) {
    return { previous: null, next: null };
  }

  return {
    previous: columns[currentIndex + 1] ?? null,
    next: columns[currentIndex - 1] ?? null,
  };
}
