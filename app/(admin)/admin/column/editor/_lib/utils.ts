import type { ColumnPostDto, ColumnPostStatus, EditorForm, EditorUpsertPayload } from "./types";

export const INITIAL_FORM: EditorForm = {
  title: "",
  excerpt: "",
  slug: "",
  tags: "",
  authorName: "",
  coverImageUrl: "",
  contentMarkdown: `## 제목을 입력하세요

본문을 마크다운으로 작성하세요.
`,
};

export function parseTags(text: string) {
  return text
    .split(/[,\n/|]/g)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR");
}

export function estimateReadingMinutes(contentMarkdown: string) {
  return Math.max(1, Math.ceil(contentMarkdown.length / 450));
}

export function buildUpsertPayload(form: EditorForm): EditorUpsertPayload {
  return {
    title: form.title.trim(),
    excerpt: form.excerpt.trim(),
    slug: slugify(form.slug || form.title),
    tags: parseTags(form.tags),
    authorName: form.authorName.trim(),
    coverImageUrl: form.coverImageUrl.trim() || undefined,
    contentMarkdown: form.contentMarkdown,
  };
}

export function applyPostToFormState(post: ColumnPostDto) {
  const nextForm: EditorForm = {
    title: post.title,
    excerpt: post.excerpt || "",
    slug: post.slug,
    tags: post.tags.join(", "),
    authorName: post.authorName || "",
    coverImageUrl: post.coverImageUrl || "",
    contentMarkdown: post.contentMarkdown,
  };

  return {
    form: nextForm,
    status: post.status,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  };
}

export function buildDevFileMarkdown(form: EditorForm, status: ColumnPostStatus) {
  const slug = slugify(form.slug || form.title);
  const tags = parseTags(form.tags);
  const frontmatter = [
    "---",
    `title: ${form.title || "제목 없음"}`,
    `description: ${form.excerpt || "설명 없음"}`,
    `date: ${new Date().toISOString().slice(0, 10)}`,
    `draft: ${status === "draft" ? "true" : "false"}`,
    "tags:",
    ...(tags.length > 0 ? tags.map((tag) => `  - ${tag}`) : ["  - 칼럼"]),
    `slug: ${slug}`,
    "---",
    "",
  ].join("\n");

  return {
    slug,
    markdown: `${frontmatter}${form.contentMarkdown.trim()}\n`,
  };
}
