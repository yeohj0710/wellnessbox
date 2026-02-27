import { z } from "zod";
import type { ColumnPost } from "@prisma/client";
import { Prisma } from "@prisma/client";
import db from "@/lib/db";
import {
  estimateReadingMinutesFromMarkdown,
  normalizeColumnStatus,
  normalizeColumnTags,
  slugifyColumnSlug,
  summarizeMarkdown,
} from "@/lib/column/content";

const STATUS_VALUES = ["draft", "published"] as const;

const optionalUrlSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().url().max(600).optional()
);

const nullableOptionalUrlSchema = z.preprocess(
  (value) => {
    if (value === null) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z.string().url().max(600).nullable().optional()
);

export const createPostSchema = z.object({
  title: z.string().trim().min(1).max(180),
  excerpt: z.string().trim().max(400).optional(),
  contentMarkdown: z.string().min(1),
  slug: z.string().trim().max(180).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  status: z.enum(STATUS_VALUES).optional(),
  publishedAt: z.string().datetime().optional(),
  authorName: z.string().trim().max(80).optional(),
  coverImageUrl: optionalUrlSchema,
});

export const updatePostSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  excerpt: z.string().trim().max(400).nullable().optional(),
  contentMarkdown: z.string().min(1).optional(),
  slug: z.string().trim().max(180).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  status: z.enum(STATUS_VALUES).optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  authorName: z.string().trim().max(80).nullable().optional(),
  coverImageUrl: nullableOptionalUrlSchema,
});

export const publishPostSchema = z.object({
  publish: z.boolean().default(true),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export function normalizeExcerpt(
  excerpt: string | null | undefined,
  contentMarkdown: string
) {
  const trimmed = excerpt?.trim() || "";
  return trimmed.length > 0 ? trimmed : summarizeMarkdown(contentMarkdown, 160);
}

export function resolveCreatePostPublishedAt(
  status: "draft" | "published",
  publishedAt?: string
) {
  if (status !== "published") return null;
  return publishedAt ? new Date(publishedAt) : new Date();
}

function fallbackSlug() {
  return `column-${Date.now()}`;
}

export function resolveSlugInput(input: { title?: string; slug?: string }) {
  const explicit = slugifyColumnSlug(input.slug || "");
  if (explicit) return explicit;
  const fromTitle = slugifyColumnSlug(input.title || "");
  if (fromTitle) return fromTitle;
  return fallbackSlug();
}

function isColumnPostSlugAliasTableMissing(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2021";
  }
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes("columnpostslugalias") && message.includes("does not exist");
}

async function isSlugReservedByAlias(candidate: string, excludeId?: string) {
  try {
    const aliasClient = (db as unknown as {
      columnPostSlugAlias?: {
        findUnique: (args: unknown) => Promise<unknown>;
      };
    }).columnPostSlugAlias;
    if (!aliasClient?.findUnique) return false;

    const alias = (await aliasClient.findUnique({
      where: { slug: candidate },
      select: { postId: true },
    })) as { postId: string } | null;
    if (!alias) return false;
    if (excludeId && alias.postId === excludeId) return false;
    return true;
  } catch (error) {
    if (isColumnPostSlugAliasTableMissing(error)) return false;
    throw error;
  }
}

export async function resolveUniqueSlug(baseSlug: string, excludeId?: string) {
  let index = 0;
  let candidate = baseSlug;
  while (index < 1000) {
    const existing = await db.columnPost.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    const aliasReserved = await isSlugReservedByAlias(candidate, excludeId);
    if (!existing && !aliasReserved) return candidate;
    index += 1;
    candidate = `${baseSlug}-${index + 1}`;
  }
  return `${baseSlug}-${Date.now()}`;
}

type ResolvePatchDataInput = {
  id: string;
  existing: ColumnPost;
  patch: UpdatePostInput;
};

export async function resolveColumnPostPatchData(input: ResolvePatchDataInput) {
  let nextSlug = input.existing.slug;
  if (input.patch.slug !== undefined) {
    const baseSlug = resolveSlugInput({
      slug: input.patch.slug,
      title: input.patch.title ?? input.existing.title,
    });
    nextSlug = await resolveUniqueSlug(baseSlug, input.id);
  }

  const nextStatus = input.patch.status
    ? normalizeColumnStatus(input.patch.status)
    : normalizeColumnStatus(input.existing.status);

  let nextPublishedAt = input.existing.publishedAt;
  if (input.patch.publishedAt !== undefined) {
    nextPublishedAt = input.patch.publishedAt ? new Date(input.patch.publishedAt) : null;
  }
  if (nextStatus === "published" && !nextPublishedAt) {
    nextPublishedAt = new Date();
  }
  if (nextStatus !== "published") {
    nextPublishedAt = null;
  }

  const contentMarkdown = input.patch.contentMarkdown ?? input.existing.contentMarkdown;
  const excerptInput =
    input.patch.excerpt === undefined
      ? input.existing.excerpt
      : input.patch.excerpt ?? null;

  return {
    slug: nextSlug,
    title: input.patch.title?.trim() ?? input.existing.title,
    excerpt: normalizeExcerpt(excerptInput, contentMarkdown),
    contentMarkdown,
    tags:
      input.patch.tags !== undefined
        ? normalizeColumnTags(input.patch.tags)
        : input.existing.tags,
    status: nextStatus,
    publishedAt: nextPublishedAt,
    authorName:
      input.patch.authorName !== undefined
        ? input.patch.authorName?.trim() || null
        : input.existing.authorName,
    coverImageUrl:
      input.patch.coverImageUrl !== undefined
        ? input.patch.coverImageUrl?.trim() || null
        : input.existing.coverImageUrl,
  };
}

export function toColumnPostDto(post: ColumnPost) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? "",
    contentMarkdown: post.contentMarkdown,
    tags: normalizeColumnTags(post.tags),
    status: normalizeColumnStatus(post.status),
    publishedAt: post.publishedAt?.toISOString() ?? null,
    authorName: post.authorName ?? null,
    coverImageUrl: post.coverImageUrl ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    readingMinutes: estimateReadingMinutesFromMarkdown(post.contentMarkdown),
  };
}
