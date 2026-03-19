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
import {
  collectColumnTags,
  resolveColumnsByTagSlug,
  selectAdjacentColumnSummaries,
  selectRelatedColumnSummaries,
} from "./columns-summary-queries";
import { fetchPublishedDbAliasRowBySlug, fetchPublishedDbRows } from "./columns-db-source";
import { collectMarkdownFiles } from "./columns-file-source";
import type { ColumnDetail, ColumnSummary, ColumnTag, TocItem } from "./columns-types";
export type { ColumnDetail, ColumnSummary, ColumnTag, TocItem } from "./columns-types";

export { buildHeadingAnchorId, normalizeTagSlug };

const CONTENT_ROOT = path.join(process.cwd(), "app", "column", "_content");
const KOREA_TIME_ZONE = "Asia/Seoul";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

function normalizeEditorialTitle(value: string) {
  return value.replace(/^웰니스박스 가이드[:：]\s*/u, "").trim();
}

function normalizeEditorialDescription(value: string) {
  return value.replace(/^안녕하세요,\s*웰니스박스예요\.?\s*/u, "").trim();
}

function normalizeEditorialContent(content: string, normalizedTitle: string) {
  return content
    .replace(/^#\s+웰니스박스 가이드[:：]\s*(.+)$/mu, `# ${normalizedTitle}`)
    .replace(/^안녕하세요,\s*웰니스박스예요\.\s*\n+/mu, "")
    .trim();
}

function resolveCurrentKoreaScheduleAnchor() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return new Date(`${year}-${month}-${day}T12:00:00+09:00`);
}

function normalizeColumnPublishSchedule(columns: ColumnDetail[]) {
  const scheduleAnchor = resolveCurrentKoreaScheduleAnchor();
  const hasFutureDate = columns.some((column) => {
    const publishedAt = new Date(column.publishedAt);
    return !Number.isNaN(publishedAt.getTime()) && publishedAt.getTime() > scheduleAnchor.getTime();
  });

  if (!hasFutureDate) return columns;

  return columns.map((column, index) => ({
    ...column,
    publishedAt: new Date(scheduleAnchor.getTime() - index * DAY_IN_MS).toISOString(),
  }));
}

async function parseColumnFile(absolutePath: string): Promise<ColumnDetail> {
  const [raw, stat] = await Promise.all([fs.readFile(absolutePath, "utf8"), fs.stat(absolutePath)]);
  const { frontmatter, content } = splitFrontmatter(raw);
  const fallbackSlug = path
    .relative(CONTENT_ROOT, absolutePath)
    .replace(/\\/g, "/")
    .replace(MARKDOWN_EXTENSION, "");
  const slug =
    normalizeSlug(frontmatter.slug || "") || normalizeSlug(fallbackSlug);
  const publishedAt = toIsoDate(frontmatter.date, stat.mtime);
  const rawTitle =
    stripWrappedQuotes(frontmatter.title || "") ||
    humanizeSlug(fallbackSlug) ||
    "웰니스박스 칼럼";
  const title = normalizeEditorialTitle(rawTitle);
  const normalizedContent = normalizeEditorialContent(content, title);
  const plainText = stripMarkdown(normalizedContent);
  const toc = buildToc(normalizedContent);
  const descriptionSource =
    stripWrappedQuotes(frontmatter.description || frontmatter.summary || "") || "";
  const description =
    normalizeEditorialDescription(descriptionSource) ||
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
    content: normalizedContent,
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
  const title = normalizeEditorialTitle(post.title.trim() || "웰니스박스 칼럼");
  const content = normalizeEditorialContent(post.contentMarkdown, title);
  const plainText = stripMarkdown(content);
  const description =
    normalizeEditorialDescription((post.excerpt || "").trim()) ||
    summarize(plainText, 160) ||
    "웰니스박스 칼럼이에요.";

  return {
    postId: post.id,
    slug: normalizeSlug(post.slug),
    title,
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
  return normalizeColumnPublishSchedule(sortColumnsByDateDesc(merged));
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

  const publishedColumns = await getPublishedColumns();

  const direct = publishedColumns.find((column) => column.slug === normalized);
  if (direct) {
    return {
      requestedSlug: requested,
      canonicalSlug: direct.slug,
      shouldRedirect: direct.slug !== requested,
      source: direct.postId ? "db" : "file",
      column: direct,
    };
  }

  const dbAlias = await getPublishedDbColumnByAliasSlug(normalized);
  if (dbAlias) {
    const canonicalColumn =
      publishedColumns.find((column) => column.slug === normalizeSlug(dbAlias.slug)) ??
      dbAlias;
    return {
      requestedSlug: requested,
      canonicalSlug: canonicalColumn.slug,
      shouldRedirect: canonicalColumn.slug !== requested,
      source: "db-alias",
      column: canonicalColumn,
    };
  }

  const legacy = publishedColumns.find((column) => column.legacySlugs.includes(normalized));
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
  return collectColumnTags(columns);
}

export async function getColumnsByTagSlug(
  tagSlug: string
): Promise<{ tag: ColumnTag | null; columns: ColumnSummary[] }> {
  const columns = await getAllColumnSummaries();
  return resolveColumnsByTagSlug(columns, tagSlug);
}

export async function getRelatedColumnSummaries(
  slug: string,
  limit = 3
): Promise<ColumnSummary[]> {
  const columns = await getAllColumnSummaries();
  return selectRelatedColumnSummaries(columns, slug, limit);
}

export async function getAdjacentColumnSummaries(slug: string): Promise<{
  previous: ColumnSummary | null;
  next: ColumnSummary | null;
}> {
  const columns = await getAllColumnSummaries();
  return selectAdjacentColumnSummaries(columns, slug);
}
