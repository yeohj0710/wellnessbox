import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { normalizeColumnStatus, normalizeColumnTags } from "@/lib/column/content";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { requireAdminSession } from "@/lib/server/route-auth";
import {
  normalizeExcerpt,
  resolveSlugInput,
  resolveUniqueSlug,
  toColumnPostDto,
  updatePostSchema,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function revalidateColumnPublicPaths() {
  revalidatePath("/column");
  revalidatePath("/column/rss.xml");
  revalidatePath("/sitemap.xml");
}

export async function GET(_req: Request, ctx: RouteContext) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const { id } = await ctx.params;
    const post = await db.columnPost.findUnique({ where: { id } });
    if (!post) {
      return noStoreJson({ ok: false, error: "게시글을 찾을 수 없습니다." }, 404);
    }
    return noStoreJson({
      ok: true,
      post: toColumnPostDto(post),
    });
  } catch (error) {
    const dbError = resolveDbRouteError(
      error,
      "게시글을 불러오지 못했습니다."
    );
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}

export async function PATCH(req: Request, ctx: RouteContext) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const { id } = await ctx.params;
    const existing = await db.columnPost.findUnique({ where: { id } });
    if (!existing) {
      return noStoreJson({ ok: false, error: "게시글을 찾을 수 없습니다." }, 404);
    }

    const body = await req.json().catch(() => null);
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return noStoreJson(
        { ok: false, error: parsed.error.issues[0]?.message || "입력값을 확인해 주세요." },
        400
      );
    }

    let nextSlug = existing.slug;
    if (parsed.data.slug !== undefined) {
      const baseSlug = resolveSlugInput({
        slug: parsed.data.slug,
        title: parsed.data.title ?? existing.title,
      });
      nextSlug = await resolveUniqueSlug(baseSlug, id);
    }

    const nextStatus = parsed.data.status
      ? normalizeColumnStatus(parsed.data.status)
      : normalizeColumnStatus(existing.status);
    let nextPublishedAt = existing.publishedAt;
    if (parsed.data.publishedAt !== undefined) {
      nextPublishedAt = parsed.data.publishedAt ? new Date(parsed.data.publishedAt) : null;
    }
    if (nextStatus === "published" && !nextPublishedAt) {
      nextPublishedAt = new Date();
    }
    if (nextStatus !== "published") {
      nextPublishedAt = null;
    }

    const contentMarkdown = parsed.data.contentMarkdown ?? existing.contentMarkdown;
    const excerptInput =
      parsed.data.excerpt === undefined
        ? existing.excerpt
        : parsed.data.excerpt ?? null;

    const updated = await db.columnPost.update({
      where: { id },
      data: {
        slug: nextSlug,
        title: parsed.data.title?.trim() ?? existing.title,
        excerpt: normalizeExcerpt(excerptInput, contentMarkdown),
        contentMarkdown,
        tags:
          parsed.data.tags !== undefined
            ? normalizeColumnTags(parsed.data.tags)
            : existing.tags,
        status: nextStatus,
        publishedAt: nextPublishedAt,
        authorName:
          parsed.data.authorName !== undefined
            ? parsed.data.authorName?.trim() || null
            : existing.authorName,
        coverImageUrl:
          parsed.data.coverImageUrl !== undefined
            ? parsed.data.coverImageUrl?.trim() || null
            : existing.coverImageUrl,
      },
    });

    revalidateColumnPublicPaths();
    return noStoreJson({
      ok: true,
      post: toColumnPostDto(updated),
    });
  } catch (error) {
    const dbError = resolveDbRouteError(error, "게시글 수정에 실패했습니다.");
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const { id } = await ctx.params;
    const existing = await db.columnPost.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return noStoreJson({ ok: false, error: "게시글을 찾을 수 없습니다." }, 404);
    }

    await db.columnPost.delete({ where: { id } });
    revalidateColumnPublicPaths();
    return noStoreJson({ ok: true });
  } catch (error) {
    const dbError = resolveDbRouteError(error, "게시글 삭제에 실패했습니다.");
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
