import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { periodKeyToCycle, resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { requireAdminSession } from "@/lib/server/route-auth";
import { resolveDbRouteError } from "@/lib/server/db-error";

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
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request, ctx: RouteContext) {
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const periodKey = searchParams.get("period");

    const { employeeId } = await ctx.params;
    const employee = await db.b2bEmployee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return noStoreJson({ ok: false, error: "임직원을 찾을 수 없습니다." }, 404);
    }

    const latest = await db.b2bPharmacistNote.findFirst({
      where: {
        employeeId,
        ...(periodKey ? { periodKey } : {}),
      },
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
            periodKey: latest.periodKey ?? null,
            reportCycle: latest.reportCycle ?? null,
            updatedAt: latest.updatedAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    const dbError = resolveDbRouteError(
      error,
      "약사 코멘트 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    );
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}

export async function PUT(req: Request, ctx: RouteContext) {
  try {
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
        { ok: false, error: parsed.error.issues[0]?.message || "입력 형식을 확인해 주세요." },
        400
      );
    }

    const periodKey = parsed.data.periodKey ?? resolveCurrentPeriodKey();
    const reportCycle = periodKeyToCycle(periodKey);

    const latest = await db.b2bPharmacistNote.findFirst({
      where: { employeeId, periodKey },
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
            periodKey,
            reportCycle: reportCycle ?? null,
          },
        })
      : await db.b2bPharmacistNote.create({
          data: {
            employeeId,
            note: parsed.data.note ?? null,
            recommendations: parsed.data.recommendations ?? null,
            cautions: parsed.data.cautions ?? null,
            createdByAdminTag: parsed.data.actorTag ?? "admin",
            periodKey,
            reportCycle: reportCycle ?? null,
          },
        });

    await logB2bAdminAction({
      employeeId,
      action: "pharmacist_note_upsert",
      actorTag: parsed.data.actorTag ?? "admin",
      payload: { noteId: note.id, periodKey },
    });

    return noStoreJson({
      ok: true,
      note: {
        id: note.id,
        periodKey: note.periodKey ?? periodKey,
        reportCycle: note.reportCycle ?? null,
        updatedAt: note.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const dbError = resolveDbRouteError(
      error,
      "약사 코멘트 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    );
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
