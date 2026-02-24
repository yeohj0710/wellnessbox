import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import {
  ensureLatestB2bReport,
  listB2bReportPeriods,
  regenerateB2bReport,
} from "@/lib/b2b/report-service";
import { requireAdminSession } from "@/lib/server/route-auth";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ employeeId: string }>;
};

const postSchema = z.object({
  regenerate: z.boolean().optional(),
  pageSize: z.enum(["A4", "LETTER"]).optional(),
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  recomputeAnalysis: z.boolean().optional(),
  generateAiEvaluation: z.boolean().optional(),
});

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request, ctx: RouteContext) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const periodKey = searchParams.get("period") || resolveCurrentPeriodKey();

  const { employeeId } = await ctx.params;
  const employee = await db.b2bEmployee.findUnique({ where: { id: employeeId } });
  if (!employee) {
    return noStoreJson({ ok: false, error: "임직원을 찾을 수 없습니다." }, 404);
  }

  const [latest, reports, availablePeriods] = await Promise.all([
    ensureLatestB2bReport(employeeId, periodKey),
    db.b2bReport.findMany({
      where: { employeeId },
      orderBy: [{ periodKey: "desc" }, { variantIndex: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
    listB2bReportPeriods(employeeId),
  ]);

  return noStoreJson({
    ok: true,
    latest: {
      id: latest.id,
      variantIndex: latest.variantIndex,
      status: latest.status,
      pageSize: latest.pageSize,
      stylePreset: latest.stylePreset,
      periodKey: latest.periodKey ?? periodKey,
      reportCycle: latest.reportCycle ?? null,
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
      periodKey: report.periodKey ?? null,
      reportCycle: report.reportCycle ?? null,
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    })),
    availablePeriods,
    periodKey: latest.periodKey ?? periodKey,
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
      { ok: false, error: parsed.error.issues[0]?.message || "입력 형식을 확인해 주세요." },
      400
    );
  }

  const periodKey = parsed.data.periodKey ?? resolveCurrentPeriodKey();
  const report = parsed.data.regenerate
    ? await regenerateB2bReport({
        employeeId,
        pageSize: parsed.data.pageSize ?? "A4",
        periodKey,
        recomputeAnalysis: parsed.data.recomputeAnalysis,
        generateAiEvaluation: parsed.data.generateAiEvaluation,
      })
    : await ensureLatestB2bReport(employeeId, periodKey);

  await logB2bAdminAction({
    employeeId,
    action: parsed.data.regenerate ? "report_regenerate" : "report_ensure",
    actorTag: "admin",
    payload: {
      reportId: report.id,
      variantIndex: report.variantIndex,
      periodKey: report.periodKey ?? periodKey,
      recomputeAnalysis: parsed.data.recomputeAnalysis === true,
      generateAiEvaluation: parsed.data.generateAiEvaluation === true,
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
      periodKey: report.periodKey ?? periodKey,
      reportCycle: report.reportCycle ?? null,
      payload: report.reportPayload,
      layoutDsl: report.layoutDsl,
      exportAudit: report.exportAudit,
      updatedAt: report.updatedAt.toISOString(),
    },
  });
}
