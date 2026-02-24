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
  payload: z.unknown(),
  version: z.number().int().min(1).optional(),
  computedAt: z.string().datetime().optional(),
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function asJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

export async function GET(_req: Request, ctx: RouteContext) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { employeeId } = await ctx.params;
  const employee = await db.b2bEmployee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return noStoreJson({ ok: false, error: "임직원을 찾을 수 없습니다." }, 404);
  }

  const latest = await db.b2bAnalysisResult.findFirst({
    where: { employeeId },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
  });

  return noStoreJson({
    ok: true,
    analysis: latest
      ? {
          id: latest.id,
          version: latest.version,
          payload: latest.payload,
          computedAt: latest.computedAt?.toISOString() ?? null,
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

  const latest = await db.b2bAnalysisResult.findFirst({
    where: { employeeId },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
  });

  const targetVersion =
    parsed.data.version ??
    (latest && typeof latest.version === "number" ? latest.version + 1 : 1);

  const existingByVersion = await db.b2bAnalysisResult.findUnique({
    where: {
      employeeId_version: {
        employeeId,
        version: targetVersion,
      },
    },
  });

  const analysis = existingByVersion
    ? await db.b2bAnalysisResult.update({
        where: { id: existingByVersion.id },
        data: {
          payload: asJsonValue(parsed.data.payload),
          computedAt: parsed.data.computedAt ? new Date(parsed.data.computedAt) : new Date(),
        },
      })
    : await db.b2bAnalysisResult.create({
        data: {
          employeeId,
          version: targetVersion,
          payload: asJsonValue(parsed.data.payload),
          computedAt: parsed.data.computedAt ? new Date(parsed.data.computedAt) : new Date(),
        },
      });

  await logB2bAdminAction({
    employeeId,
    action: "analysis_upsert",
    actorTag: "admin",
    payload: {
      analysisId: analysis.id,
      version: analysis.version,
    },
  });

  return noStoreJson({
    ok: true,
    analysis: {
      id: analysis.id,
      version: analysis.version,
      updatedAt: analysis.updatedAt.toISOString(),
    },
  });
}
