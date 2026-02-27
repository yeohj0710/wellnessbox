import "server-only";

import { promises as fs } from "fs";
import path from "path";
import {
  MARKDOWN_EXTENSION,
  buildHeadingAnchorId,
  buildToc,
  estimateReadingMinutes,
  humanizeSlug,
  normalizeSlug,
  normalizeTagSlug,
  parseBoolean,
  parseLegacySlugList,
  parseTagList,
  safeDecodeURIComponent,
  splitFrontmatter,
  stripMarkdown,
  stripWrappedQuotes,
  summarize,
  toIsoDate,
} from "./columns-content-utils";
import { fetchPublishedDbAliasRowBySlug, fetchPublishedDbRowBySlug, fetchPublishedDbRows } from "./columns-db-source";
import { collectMarkdownFiles } from "./columns-file-source";
import type { ColumnDetail, ColumnSummary, ColumnTag, TocItem } from "./columns-types";
export type { ColumnDetail, ColumnSummary, ColumnTag, TocItem } from "./columns-types";

export { buildHeadingAnchorId, normalizeTagSlug };

const CONTENT_ROOT = path.join(process.cwd(), "app", "column", "_content");

async function parseColumnFile(absolutePath: string): Promise<ColumnDetail> {
  const [raw, stat] = await Promise.all([fs.readFile(absolutePath, "utf8"), fs.stat(absolutePath)]);
  const { frontmatter, content } = splitFrontmatter(raw);
  const plainText = stripMarkdown(content);
  const toc = buildToc(content);
  const fallbackSlug = path
    .relative(CONTENT_ROOT, absolutePath)
    .replace(/\\/g, "/")
    .replace(MARKDOWN_EXTENSION, "");
  const slug =
    normalizeSlug(frontmatter.slug || "") || normalizeSlug(fallbackSlug);
  const publishedAt = toIsoDate(frontmatter.date, stat.mtime);
  const title =
    stripWrappedQuotes(frontmatter.title || "") ||
    humanizeSlug(fallbackSlug) ||
    "웰니스박스 칼럼";
  const description =
    stripWrappedQuotes(frontmatter.description || frontmatter.summary || "") ||
    summarize(plainText, 160) ||
    "웰니스박스 칼럼이에요.";
  const tags = parseTagList(frontmatter.tags);
  const coverImageRaw = stripWrappedQuotes(
    frontmatter.coverImageUrl || frontmatter.coverImage || ""
  );
  const coverImageUrl = coverImageRaw || null;
  const legacySlugs = parseLegacySlugList(frontmatter.legacySlugs).filter(
    (entry) => entry !== slug
  );
  const draft = parseBoolean(frontmatter.draft);

  return {
    postId: null,
    slug,
    title,
    description,
    summary: description,
    publishedAt,
    tags,
    coverImageUrl,
    content,
    toc,
    legacySlugs,
    draft,
    updatedAt: stat.mtime.toISOString(),
    readingMinutes: estimateReadingMinutes(plainText),
  };
}

function sortColumnsByDateDesc(columns: ColumnDetail[]) {
  return [...columns].sort((a, b) => {
    const byPublishedAt =
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    if (byPublishedAt !== 0) return byPublishedAt;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function toSummary(column: ColumnDetail): ColumnSummary {
  const { content: _content, toc: _toc, legacySlugs: _legacySlugs, ...summary } = column;
  return summary;
}

function mapDbPostToColumnDetail(post: {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  contentMarkdown: string;
  tags: string[];
  status: string;
  publishedAt: Date | null;
  coverImageUrl: string | null;
  updatedAt: Date;
}) {
  const content = post.contentMarkdown;
  const plainText = stripMarkdown(content);
  const description =
    (post.excerpt || "").trim() || summarize(plainText, 160) || "웰니스박스 칼럼이에요.";

  return {
    postId: post.id,
    slug: normalizeSlug(post.slug),
    title: post.title.trim() || "웰니스박스 칼럼",
    description,
    summary: description,
    publishedAt: (post.publishedAt ?? post.updatedAt).toISOString(),
    tags: post.tags.filter((item) => typeof item === "string" && item.trim().length > 0),
    coverImageUrl: post.coverImageUrl?.trim() || null,
    content,
    toc: buildToc(content),
    legacySlugs: [],
    draft: post.status !== "published",
    updatedAt: post.updatedAt.toISOString(),
    readingMinutes: estimateReadingMinutes(plainText),
  } satisfies ColumnDetail;
}

async function getAllFileColumns(): Promise<ColumnDetail[]> {
  const files = await collectMarkdownFiles(CONTENT_ROOT);
  const columns = await Promise.all(files.map(parseColumnFile));
  return sortColumnsByDateDesc(columns.filter((column) => Boolean(column.slug)));
}

async function getPublishedFileColumns() {
  const columns = await getAllFileColumns();
  return columns.filter((column) => !column.draft);
}

async function getPublishedDbColumns(): Promise<ColumnDetail[]> {
  const rows = await fetchPublishedDbRows();
  return sortColumnsByDateDesc(
    rows
      .map(mapDbPostToColumnDetail)
      .filter((column) => Boolean(column.slug) && !column.draft)
  );
}

async function getPublishedDbColumnBySlug(slug: string): Promise<ColumnDetail | null> {
  const row = await fetchPublishedDbRowBySlug(slug);
  return row ? mapDbPostToColumnDetail(row) : null;
}

async function getPublishedDbColumnByAliasSlug(
  slug: string
): Promise<ColumnDetail | null> {
  const row = await fetchPublishedDbAliasRowBySlug(slug);
  return row ? mapDbPostToColumnDetail(row) : null;
}

async function getPublishedColumns(): Promise<ColumnDetail[]> {
  const [dbColumns, fileColumns] = await Promise.all([
    getPublishedDbColumns(),
    getPublishedFileColumns(),
  ]);
  const dbSlugSet = new Set(dbColumns.map((column) => column.slug));
  const merged = [
    ...dbColumns,
    ...fileColumns.filter((column) => !dbSlugSet.has(column.slug)),
  ];
  return sortColumnsByDateDesc(merged);
}

export async function getAllColumnSummaries(): Promise<ColumnSummary[]> {
  const columns = await getPublishedColumns();
  return columns.map(toSummary);
}

export type ColumnSlugResolution = {
  requestedSlug: string;
  canonicalSlug: string | null;
  shouldRedirect: boolean;
  source: "db" | "db-alias" | "file" | "file-legacy" | null;
  column: ColumnDetail | null;
};

export async function resolveColumnBySlug(
  slug: string
): Promise<ColumnSlugResolution> {
  const requested = safeDecodeURIComponent(slug)
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "");
  const normalized = normalizeSlug(requested);
  if (!normalized) {
    return {
      requestedSlug: requested,
      canonicalSlug: null,
      shouldRedirect: false,
      source: null,
      column: null,
    };
  }

  const dbFirst = await getPublishedDbColumnBySlug(normalized);
  if (dbFirst) {
    return {
      requestedSlug: requested,
      canonicalSlug: dbFirst.slug,
      shouldRedirect: dbFirst.slug !== requested,
      source: "db",
      column: dbFirst,
    };
  }

  const dbAlias = await getPublishedDbColumnByAliasSlug(normalized);
  if (dbAlias) {
    return {
      requestedSlug: requested,
      canonicalSlug: dbAlias.slug,
      shouldRedirect: dbAlias.slug !== requested,
      source: "db-alias",
      column: dbAlias,
    };
  }

  const fileColumns = await getPublishedFileColumns();
  const direct = fileColumns.find((column) => column.slug === normalized);
  if (direct) {
    return {
      requestedSlug: requested,
      canonicalSlug: direct.slug,
      shouldRedirect: direct.slug !== requested,
      source: "file",
      column: direct,
    };
  }

  const legacy = fileColumns.find((column) => column.legacySlugs.includes(normalized));
  if (legacy) {
    return {
      requestedSlug: requested,
      canonicalSlug: legacy.slug,
      shouldRedirect: legacy.slug !== requested,
      source: "file-legacy",
      column: legacy,
    };
  }

  return {
    requestedSlug: requested,
    canonicalSlug: null,
    shouldRedirect: false,
    source: null,
    column: null,
  };
}

export async function getColumnBySlug(slug: string): Promise<ColumnDetail | null> {
  const resolved = await resolveColumnBySlug(slug);
  return resolved.column;
}

export async function getAllColumnTags(): Promise<ColumnTag[]> {
  const columns = await getAllColumnSummaries();
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

export async function getColumnsByTagSlug(
  tagSlug: string
): Promise<{ tag: ColumnTag | null; columns: ColumnSummary[] }> {
  const normalized = normalizeTagSlug(tagSlug);
  if (!normalized) {
    return { tag: null, columns: [] };
  }

  const [allTags, columns] = await Promise.all([
    getAllColumnTags(),
    getAllColumnSummaries(),
  ]);
  const tag = allTags.find((item) => item.slug === normalized) ?? null;
  if (!tag) {
    return { tag: null, columns: [] };
  }

  const tagged = columns.filter((column) =>
    column.tags.some((rawTag) => normalizeTagSlug(rawTag) === normalized)
  );
  return { tag, columns: tagged };
}

export async function getRelatedColumnSummaries(
  slug: string,
  limit = 3
): Promise<ColumnSummary[]> {
  const normalized = normalizeSlug(slug);
  if (!normalized || limit <= 0) return [];

  const columns = await getAllColumnSummaries();
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

export async function getAdjacentColumnSummaries(slug: string): Promise<{
  previous: ColumnSummary | null;
  next: ColumnSummary | null;
}> {
  const normalized = normalizeSlug(slug);
  if (!normalized) {
    return { previous: null, next: null };
  }

  const columns = await getAllColumnSummaries();
  const currentIndex = columns.findIndex((column) => column.slug === normalized);
  if (currentIndex < 0) {
    return { previous: null, next: null };
  }

  return {
    previous: columns[currentIndex + 1] ?? null,
    next: columns[currentIndex - 1] ?? null,
  };
}
