import type { ColumnPostDto, ColumnPostStatus, EditorForm, EditorUpsertPayload } from "./types";

export const INITIAL_FORM: EditorForm = {
  title: "",
  excerpt: "",
  slug: "",
  tags: "",
  authorName: "",
  coverImageUrl: "",
  contentMarkdown: `## 독자가 이 글을 찾는 상황

사용자가 실제로 어떤 상황에서 이 글을 읽게 되는지 한두 문단으로 시작하세요. 인사말이나 브랜드 소개보다 문제 상황을 먼저 적는 편이 좋아요.

## 왜 헷갈리는지부터 설명

복용 시간, 음식, 약물, 생활 습관처럼 결과를 바꾸는 변수를 풀어서 설명하세요. "무조건 이렇게 하세요"보다 조건과 예외를 함께 적어 주세요.

## 실제로 지키기 쉬운 기준

- 바로 적용할 수 있는 최소 원칙
- 자주 놓치는 실수
- 이런 경우에는 상담이 먼저라는 경고

## 참고 자료

- 최소 2개 이상의 외부 참고 자료 링크
- 관련 칼럼 내부 링크 2개 이상
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
