import db from "@/lib/db";
import { getAllColumnSummaries, getColumnBySlug } from "@/app/column/_lib/columns";
import { normalizeColumnStatus, normalizeColumnTags } from "@/lib/column/content";
import { revalidateColumnPublicPaths } from "@/lib/column/revalidate";
import {
  type CreatePostInput,
  normalizeExcerpt,
  resolveCreatePostPublishedAt,
  resolveSlugInput,
  resolveUniqueSlug,
  toColumnPostDto,
} from "./_shared";

const DEFAULT_LIST_TAKE = 100;
const MAX_LIST_TAKE = 200;
const FILE_COLUMN_DEFAULT_AUTHOR =
  "\uC6F0\uB2C8\uC2A4\uBC15\uC2A4";

function resolveListTake(raw: string | null) {
  const parsed = Number(raw ?? String(DEFAULT_LIST_TAKE));
  if (!Number.isFinite(parsed)) return DEFAULT_LIST_TAKE;
  return Math.min(MAX_LIST_TAKE, Math.max(1, Math.round(parsed)));
}

export function resolveAdminColumnListQuery(url: string) {
  const { searchParams } = new URL(url);
  const q = searchParams.get("q")?.trim() || "";
  const status = normalizeColumnStatus(searchParams.get("status"));
  const includeAllStatus = searchParams.get("status") === "all";
  const tag = searchParams.get("tag")?.trim() || "";
  const take = resolveListTake(searchParams.get("take"));

  return {
    where: {
      ...(includeAllStatus ? {} : { status }),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
              { excerpt: { contains: q, mode: "insensitive" as const } },
              { authorName: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    take,
  };
}

export async function listAdminColumnPosts(url: string) {
  const query = resolveAdminColumnListQuery(url);
  const posts = await db.columnPost.findMany({
    where: query.where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: query.take,
  });
  return posts.map(toColumnPostDto);
}

export async function syncFileColumnsToDb() {
  const allColumns = await getAllColumnSummaries();
  const fileBasedColumns = allColumns.filter((column) => !column.postId);
  if (fileBasedColumns.length === 0) return;

  for (const summary of fileBasedColumns) {
    const existing = await db.columnPost.findUnique({
      where: { slug: summary.slug },
      select: { id: true },
    });
    if (existing) continue;

    const detail = await getColumnBySlug(summary.slug);
    if (!detail || detail.postId) continue;

    await db.columnPost.create({
      data: {
        slug: summary.slug,
        title: summary.title,
        excerpt: summary.description,
        contentMarkdown: detail.content,
        tags: normalizeColumnTags(detail.tags),
        status: "published",
        publishedAt: new Date(summary.publishedAt),
        authorName: FILE_COLUMN_DEFAULT_AUTHOR,
        coverImageUrl: summary.coverImageUrl,
      },
    });
  }
}

export async function createAdminColumnPost(input: CreatePostInput) {
  const baseSlug = resolveSlugInput({
    title: input.title,
    slug: input.slug,
  });
  const slug = await resolveUniqueSlug(baseSlug);
  const status = normalizeColumnStatus(input.status);

  const post = await db.columnPost.create({
    data: {
      slug,
      title: input.title.trim(),
      excerpt: normalizeExcerpt(input.excerpt, input.contentMarkdown),
      contentMarkdown: input.contentMarkdown,
      tags: normalizeColumnTags(input.tags),
      status,
      publishedAt: resolveCreatePostPublishedAt(status, input.publishedAt),
      authorName: input.authorName?.trim() || null,
      coverImageUrl: input.coverImageUrl?.trim() || null,
    },
  });

  revalidateColumnPublicPaths();
  return toColumnPostDto(post);
}
