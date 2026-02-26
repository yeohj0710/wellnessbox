import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAllColumnSummaries, getColumnBySlug } from "@/app/column/_lib/columns";
import db from "@/lib/db";
import { normalizeColumnStatus, normalizeColumnTags } from "@/lib/column/content";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { requireAdminSession } from "@/lib/server/route-auth";
import {
  createPostSchema,
  normalizeExcerpt,
  resolveSlugInput,
  resolveUniqueSlug,
  toColumnPostDto,
} from "./_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

async function syncFileColumnsToDb() {
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
        authorName: "웰니스박스",
        coverImageUrl: summary.coverImageUrl,
      },
    });
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;
    await syncFileColumnsToDb();

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";
    const status = normalizeColumnStatus(searchParams.get("status"));
    const includeAllStatus = searchParams.get("status") === "all";
    const tag = searchParams.get("tag")?.trim() || "";
    const takeRaw = Number(searchParams.get("take") || "100");
    const take = Number.isFinite(takeRaw)
      ? Math.min(200, Math.max(1, Math.round(takeRaw)))
      : 100;

    const posts = await db.columnPost.findMany({
      where: {
        ...(includeAllStatus ? {} : { status }),
        ...(tag ? { tags: { has: tag } } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
                { excerpt: { contains: q, mode: "insensitive" } },
                { authorName: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take,
    });

    return noStoreJson({
      ok: true,
      posts: posts.map(toColumnPostDto),
    });
  } catch (error) {
    const dbError = resolveDbRouteError(
      error,
      "게시글 목록을 불러오지 못했습니다."
    );
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => null);
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return noStoreJson(
        { ok: false, error: parsed.error.issues[0]?.message || "입력값을 확인해 주세요." },
        400
      );
    }

    const baseSlug = resolveSlugInput({
      title: parsed.data.title,
      slug: parsed.data.slug,
    });
    const slug = await resolveUniqueSlug(baseSlug);
    const status = normalizeColumnStatus(parsed.data.status);
    const publishedAt =
      status === "published"
        ? parsed.data.publishedAt
          ? new Date(parsed.data.publishedAt)
          : new Date()
        : null;

    const post = await db.columnPost.create({
      data: {
        slug,
        title: parsed.data.title.trim(),
        excerpt: normalizeExcerpt(parsed.data.excerpt, parsed.data.contentMarkdown),
        contentMarkdown: parsed.data.contentMarkdown,
        tags: normalizeColumnTags(parsed.data.tags),
        status,
        publishedAt,
        authorName: parsed.data.authorName?.trim() || null,
        coverImageUrl: parsed.data.coverImageUrl?.trim() || null,
      },
    });

    revalidateColumnPublicPaths();
    return noStoreJson({
      ok: true,
      post: toColumnPostDto(post),
    });
  } catch (error) {
    const dbError = resolveDbRouteError(error, "게시글 생성에 실패했습니다.");
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
