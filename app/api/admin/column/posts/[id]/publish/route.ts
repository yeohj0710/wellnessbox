import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { requireAdminSession } from "@/lib/server/route-auth";
import { publishPostSchema, toColumnPostDto } from "../../_shared";

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

export async function POST(req: Request, ctx: RouteContext) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const parsed = publishPostSchema.safeParse(body);
    if (!parsed.success) {
      return noStoreJson(
        { ok: false, error: parsed.error.issues[0]?.message || "입력값을 확인해 주세요." },
        400
      );
    }

    const existing = await db.columnPost.findUnique({ where: { id } });
    if (!existing) {
      return noStoreJson({ ok: false, error: "게시글을 찾을 수 없습니다." }, 404);
    }

    const publish = parsed.data.publish === true;
    const updated = await db.columnPost.update({
      where: { id },
      data: {
        status: publish ? "published" : "draft",
        publishedAt: publish ? existing.publishedAt ?? new Date() : null,
      },
    });

    revalidateColumnPublicPaths();
    return noStoreJson({
      ok: true,
      post: toColumnPostDto(updated),
    });
  } catch (error) {
    const dbError = resolveDbRouteError(error, "발행 상태 변경에 실패했습니다.");
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
