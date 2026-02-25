import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { cache } from "react";

const CONTENT_ROOT = path.join(process.cwd(), "app", "column", "_content");
const MARKDOWN_EXTENSION = /\.md$/i;
const HEADING_PATTERN = /^(#{2,3})\s+(.+)$/;
const TAG_SLUG_INVALID_PATTERN = /[^\p{L}\p{N}_-]+/gu;
const HEADING_CLEAN_PATTERN = /[`*_~[\]()<>#+!?.,:;'"\\/]/g;

type FrontmatterMap = Record<string, string>;

export type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

export type ColumnSummary = {
  slug: string;
  title: string;
  description: string;
  summary: string;
  publishedAt: string;
  tags: string[];
  updatedAt: string;
  readingMinutes: number;
  draft: boolean;
};

export type ColumnDetail = ColumnSummary & {
  content: string;
  toc: TocItem[];
};

export type ColumnTag = {
  label: string;
  slug: string;
  count: number;
};

function normalizeLineEndings(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

function stripWrappedQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function stripInlineMarkdown(value: string) {
  return value
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`[^`]*`/g, " ")
    .replace(/[*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBoolean(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ["true", "1", "yes", "y"].includes(normalized);
}

export function normalizeTagSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(TAG_SLUG_INVALID_PATTERN, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildHeadingAnchorId(input: string) {
  return stripInlineMarkdown(input)
    .toLowerCase()
    .replace(HEADING_CLEAN_PATTERN, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildToc(markdown: string): TocItem[] {
  const toc: TocItem[] = [];
  const counts = new Map<string, number>();
  const lines = normalizeLineEndings(markdown).split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(HEADING_PATTERN);
    if (!match) continue;

    const hashes = match[1] || "";
    const rawTitle = match[2] || "";
    const level = hashes.length === 2 ? 2 : 3;
    const text = stripInlineMarkdown(rawTitle);
    if (!text) continue;

    const baseId = buildHeadingAnchorId(text) || `section-${toc.length + 1}`;
    const seen = counts.get(baseId) ?? 0;
    counts.set(baseId, seen + 1);
    const id = seen === 0 ? baseId : `${baseId}-${seen}`;

    toc.push({
      id,
      text,
      level,
    });
  }

  return toc;
}

function parseFrontmatter(raw: string): FrontmatterMap {
  const parsed: FrontmatterMap = {};
  let pendingListKey: string | null = null;

  for (const rawLine of normalizeLineEndings(raw).split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }

    if (pendingListKey) {
      const listMatch = line.match(/^\s*-\s*(.+)\s*$/);
      if (listMatch) {
        const listValue = stripWrappedQuotes(listMatch[1] || "");
        parsed[pendingListKey] = parsed[pendingListKey]
          ? `${parsed[pendingListKey]},${listValue}`
          : listValue;
        continue;
      }
      pendingListKey = null;
    }

    const kvMatch = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kvMatch) {
      continue;
    }

    const [, key, rawValue] = kvMatch;
    const value = rawValue.trim();
    if (!value) {
      pendingListKey = key;
      parsed[key] = "";
      continue;
    }

    parsed[key] = stripWrappedQuotes(value);
  }

  return parsed;
}

function splitFrontmatter(markdown: string) {
  const normalized = normalizeLineEndings(markdown).trim();
  if (!normalized.startsWith("---\n")) {
    return {
      frontmatter: {} as FrontmatterMap,
      content: normalized,
    };
  }

  const closingToken = "\n---\n";
  const closingIndex = normalized.indexOf(closingToken, 4);
  if (closingIndex < 0) {
    return {
      frontmatter: {} as FrontmatterMap,
      content: normalized,
    };
  }

  const frontmatterText = normalized.slice(4, closingIndex);
  const content = normalized.slice(closingIndex + closingToken.length).trim();

  return {
    frontmatter: parseFrontmatter(frontmatterText),
    content,
  };
}

function parseTagList(rawTags: string | undefined) {
  if (!rawTags) {
    return [];
  }

  const value = rawTags.trim();
  const source =
    value.startsWith("[") && value.endsWith("]")
      ? value.slice(1, -1).split(",")
      : value.split(",");

  const tags = source
    .map((tag) => stripWrappedQuotes(tag))
    .map((tag) => tag.trim())
    .filter(Boolean);

  return Array.from(new Set(tags));
}

function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9/_-]/g, "-")
    .replace(/\/+/g, "/")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");
}

function humanizeSlug(input: string) {
  return input
    .split("/")
    .pop()
    ?.replace(/[-_]+/g, " ")
    .trim();
}

function stripMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[>*_~|]/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarize(text: string, maxLength = 140) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function estimateReadingMinutes(text: string) {
  const chars = text.replace(/\s+/g, "").length;
  return Math.max(1, Math.ceil(chars / 450));
}

function toIsoDate(rawDate: string | undefined, fallbackDate: Date) {
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return fallbackDate.toISOString();
}

async function collectMarkdownFiles(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const paths = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectMarkdownFiles(absolutePath);
      }
      return MARKDOWN_EXTENSION.test(entry.name) ? [absolutePath] : [];
    })
  );

  return paths.flat().sort();
}

async function parseColumnFile(absolutePath: string): Promise<ColumnDetail> {
  const [raw, stat] = await Promise.all([
    fs.readFile(absolutePath, "utf8"),
    fs.stat(absolutePath),
  ]);
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
    "웰니스박스 칼럼입니다.";
  const tags = parseTagList(frontmatter.tags);
  const draft = parseBoolean(frontmatter.draft);

  return {
    slug,
    title,
    description,
    summary: description,
    publishedAt,
    tags,
    content,
    toc,
    draft,
    updatedAt: stat.mtime.toISOString(),
    readingMinutes: estimateReadingMinutes(plainText),
  };
}

const getAllColumns = cache(async (): Promise<ColumnDetail[]> => {
  const files = await collectMarkdownFiles(CONTENT_ROOT);
  const columns = await Promise.all(files.map(parseColumnFile));

  return columns
    .filter((column) => Boolean(column.slug))
    .sort((a, b) => {
      const byPublishedAt =
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      if (byPublishedAt !== 0) {
        return byPublishedAt;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
});

const getPublishedColumns = cache(async (): Promise<ColumnDetail[]> => {
  const columns = await getAllColumns();
  return columns.filter((column) => !column.draft);
});

function toSummary(column: ColumnDetail): ColumnSummary {
  const { content: _content, toc: _toc, ...summary } = column;
  return summary;
}

export const getAllColumnSummaries = cache(async (): Promise<ColumnSummary[]> => {
  const columns = await getPublishedColumns();
  return columns.map(toSummary);
});

export const getColumnBySlug = cache(
  async (slug: string): Promise<ColumnDetail | null> => {
    const normalized = normalizeSlug(slug);
    if (!normalized) {
      return null;
    }
    const columns = await getPublishedColumns();
    return columns.find((column) => column.slug === normalized) ?? null;
  }
);

export const getAllColumnTags = cache(async (): Promise<ColumnTag[]> => {
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
});

export const getColumnsByTagSlug = cache(
  async (
    tagSlug: string
  ): Promise<{ tag: ColumnTag | null; columns: ColumnSummary[] }> => {
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
);

export const getRelatedColumnSummaries = cache(
  async (slug: string, limit = 3): Promise<ColumnSummary[]> => {
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
);

export const getAdjacentColumnSummaries = cache(
  async (slug: string): Promise<{
    previous: ColumnSummary | null;
    next: ColumnSummary | null;
  }> => {
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
);
