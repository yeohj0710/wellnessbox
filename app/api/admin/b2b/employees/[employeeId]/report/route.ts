import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import {
  ensureLatestB2bReport,
  regenerateB2bReport,
} from "@/lib/b2b/report-service";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ employeeId: string }>;
};

const postSchema = z.object({
  regenerate: z.boolean().optional(),
  pageSize: z.enum(["A4", "LETTER"]).optional(),
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

  const [latest, reports] = await Promise.all([
    ensureLatestB2bReport(employeeId),
    db.b2bReport.findMany({
      where: { employeeId },
      orderBy: [{ variantIndex: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
  ]);

  return noStoreJson({
    ok: true,
    latest: {
      id: latest.id,
      variantIndex: latest.variantIndex,
      status: latest.status,
      pageSize: latest.pageSize,
      stylePreset: latest.stylePreset,
      payload: latest.reportPayload,
      layoutDsl: latest.layoutDsl,
      exportAudit: latest.exportAudit,
      updatedAt: latest.updatedAt.toISOString(),
    },
    reports: reports.map((report) => ({
      id: report.id,
      variantIndex: report.variantIndex,
      status: report.status,
      pageSize: report.pageSize,
      stylePreset: report.stylePreset,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request, ctx: RouteContext) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { employeeId } = await ctx.params;
  const employee = await db.b2bEmployee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return noStoreJson({ ok: false, error: "임직원을 찾을 수 없습니다." }, 404);
  }

  const body = await req.json().catch(() => ({}));
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return noStoreJson(
      { ok: false, error: parsed.error.issues[0]?.message || "입력 형식이 올바르지 않습니다." },
      400
    );
  }

  const report = parsed.data.regenerate
    ? await regenerateB2bReport({
        employeeId,
        pageSize: parsed.data.pageSize ?? "A4",
      })
    : await ensureLatestB2bReport(employeeId);

  await logB2bAdminAction({
    employeeId,
    action: parsed.data.regenerate ? "report_regenerate" : "report_ensure",
    actorTag: "admin",
    payload: {
      reportId: report.id,
      variantIndex: report.variantIndex,
    },
  });

  return noStoreJson({
    ok: true,
    report: {
      id: report.id,
      variantIndex: report.variantIndex,
      status: report.status,
      pageSize: report.pageSize,
      stylePreset: report.stylePreset,
      payload: report.reportPayload,
      layoutDsl: report.layoutDsl,
      exportAudit: report.exportAudit,
      updatedAt: report.updatedAt.toISOString(),
    },
  });
}
