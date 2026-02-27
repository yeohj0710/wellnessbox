const HEADING_PATTERN = /^(#{2,3})\s+(.+)$/;
const TAG_SLUG_INVALID_PATTERN = /[^\p{L}\p{N}_-]+/gu;
const HEADING_CLEAN_PATTERN = /[`*_~[\]()<>#+!?.,:;'"\\/]/g;
export const MARKDOWN_EXTENSION = /\.md$/i;

type FrontmatterMap = Record<string, string>;

type HeadingTocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

export function safeDecodeURIComponent(input: string) {
  try {
    return decodeURIComponent(input);
  } catch {
    return input;
  }
}

export function normalizeLineEndings(value: string) {
  return value.replace(/\r\n?/g, "\n");
}

export function stripWrappedQuotes(value: string) {
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

export function parseBoolean(value: string | undefined) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ["true", "1", "yes", "y"].includes(normalized);
}

export function normalizeTagSlug(input: string) {
  return safeDecodeURIComponent(input)
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

export function buildToc(markdown: string): HeadingTocItem[] {
  const toc: HeadingTocItem[] = [];
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

export function splitFrontmatter(markdown: string) {
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

export function parseTagList(rawTags: string | undefined) {
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

export function normalizeSlug(input: string) {
  return safeDecodeURIComponent(input)
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}/_-]+/gu, "-")
    .replace(/\/+/g, "/")
    .replace(/-+/g, "-")
    .replace(/^[-/]+|[-/]+$/g, "");
}

export function parseLegacySlugList(rawLegacySlugs: string | undefined) {
  if (!rawLegacySlugs) return [];
  const source = rawLegacySlugs.trim();
  if (!source) return [];
  const tokens =
    source.startsWith("[") && source.endsWith("]")
      ? source.slice(1, -1).split(",")
      : source.split(",");
  return Array.from(
    new Set(
      tokens
        .map((token) => normalizeSlug(stripWrappedQuotes(token)))
        .filter(Boolean)
    )
  );
}

export function humanizeSlug(input: string) {
  return input
    .split("/")
    .pop()
    ?.replace(/[-_]+/g, " ")
    .trim();
}

export function stripMarkdown(markdown: string) {
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

export function summarize(text: string, maxLength = 140) {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

export function estimateReadingMinutes(text: string) {
  const chars = text.replace(/\s+/g, "").length;
  return Math.max(1, Math.ceil(chars / 450));
}

export function toIsoDate(rawDate: string | undefined, fallbackDate: Date) {
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return fallbackDate.toISOString();
}
