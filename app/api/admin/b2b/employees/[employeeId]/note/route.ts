import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ employeeId: string }>;
};

const putSchema = z.object({
  note: z.string().max(4000).nullable().optional(),
  recommendations: z.string().max(4000).nullable().optional(),
  cautions: z.string().max(4000).nullable().optional(),
  actorTag: z.string().max(120).optional(),
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(_req: Request, ctx: RouteContext) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { employeeId } = await ctx.params;
  const employee = await db.b2bEmployee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return noStoreJson({ ok: false, error: "임직원을 찾을 수 없습니다." }, 404);
  }

  const latest = await db.b2bPharmacistNote.findFirst({
    where: { employeeId },
    orderBy: { updatedAt: "desc" },
  });

  return noStoreJson({
    ok: true,
    note: latest
      ? {
          id: latest.id,
          note: latest.note,
          recommendations: latest.recommendations,
          cautions: latest.cautions,
          createdByAdminTag: latest.createdByAdminTag,
          updatedAt: latest.updatedAt.toISOString(),
        }
      : null,
  });
}

export async function PUT(req: Request, ctx: RouteContext) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { employeeId } = await ctx.params;
  const employee = await db.b2bEmployee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return noStoreJson({ ok: false, error: "임직원을 찾을 수 없습니다." }, 404);
  }

  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson(
      { ok: false, error: parsed.error.issues[0]?.message || "입력 형식이 올바르지 않습니다." },
      400
    );
  }

  const latest = await db.b2bPharmacistNote.findFirst({
    where: { employeeId },
    orderBy: { updatedAt: "desc" },
  });

  const note = latest
    ? await db.b2bPharmacistNote.update({
        where: { id: latest.id },
        data: {
          note: parsed.data.note ?? null,
          recommendations: parsed.data.recommendations ?? null,
          cautions: parsed.data.cautions ?? null,
          createdByAdminTag: parsed.data.actorTag ?? latest.createdByAdminTag ?? null,
        },
      })
    : await db.b2bPharmacistNote.create({
        data: {
          employeeId,
          note: parsed.data.note ?? null,
          recommendations: parsed.data.recommendations ?? null,
          cautions: parsed.data.cautions ?? null,
          createdByAdminTag: parsed.data.actorTag ?? "admin",
        },
      });

  await logB2bAdminAction({
    employeeId,
    action: "pharmacist_note_upsert",
    actorTag: parsed.data.actorTag ?? "admin",
    payload: { noteId: note.id },
  });

  return noStoreJson({
    ok: true,
    note: {
      id: note.id,
      updatedAt: note.updatedAt.toISOString(),
    },
  });
}
