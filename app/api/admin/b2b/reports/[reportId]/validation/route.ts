import { NextResponse } from "next/server";
import db from "@/lib/db";
import { runB2bLayoutPipeline } from "@/lib/b2b/export/pipeline";
import { requireAdminSession } from "@/lib/server/route-auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ reportId: string }>;
};

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(_req: Request, ctx: RouteContext) {
  const auth = await requireAdminSession();
  if (!auth.ok) return auth.response;

  const { reportId } = await ctx.params;
  const report = await db.b2bReport.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      employeeId: true,
      variantIndex: true,
      pageSize: true,
      stylePreset: true,
      reportPayload: true,
    },
  });
  if (!report) {
    return noStoreJson({ ok: false, error: "리포트를 찾을 수 없습니다." }, 404);
  }

  const pageSize = (report.pageSize || "A4") as "A4" | "LETTER";
  const stylePreset = report.stylePreset || undefined;
  const payload = JSON.parse(JSON.stringify(report.reportPayload));

  const validationResult = await runB2bLayoutPipeline({
    payload,
    intent: "export",
    pageSize,
    variantIndex: report.variantIndex,
    stylePreset: stylePreset as "fresh" | "calm" | "focus" | undefined,
  });

  await db.b2bReport.update({
    where: { id: report.id },
    data: {
      status: validationResult.ok ? "ready" : "validation_failed",
      layoutDsl: validationResult.ok
        ? JSON.parse(JSON.stringify(validationResult.layout))
        : null,
      exportAudit: JSON.parse(JSON.stringify(validationResult.audit)),
    },
  });

  if (!validationResult.ok) {
    return noStoreJson({
      ok: false,
      audit: validationResult.audit,
      issues: validationResult.issues,
    });
  }

  return noStoreJson({
    ok: true,
    audit: validationResult.audit,
    layout: validationResult.layout,
    issues: [],
  });
}
