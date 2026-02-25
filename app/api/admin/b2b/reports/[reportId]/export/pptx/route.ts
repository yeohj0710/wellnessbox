import { NextResponse } from "next/server";
import db from "@/lib/db";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { runB2bReportExport } from "@/lib/b2b/report-service";
import { requireAdminSession } from "@/lib/server/route-auth";
import { resolveDbRouteError } from "@/lib/server/db-error";

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
  try {
    const auth = await requireAdminSession();
    if (!auth.ok) return auth.response;

    const { reportId } = await ctx.params;
    const report = await db.b2bReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        employeeId: true,
        variantIndex: true,
      },
    });
    if (!report) {
      return noStoreJson({ ok: false, error: "레포트를 찾을 수 없습니다." }, 404);
    }

    const result = await runB2bReportExport(reportId);
    if (!result.ok) {
      await logB2bAdminAction({
        employeeId: report.employeeId,
        action: "report_export_validation_failed",
        actorTag: "admin",
        payload: {
          reportId,
          audit: result.audit,
        },
      });
      return noStoreJson(
        {
          ok: false,
          error: "레이아웃 검증에 실패했습니다.",
          audit: result.audit,
          issues: result.issues,
        },
        400
      );
    }

    await logB2bAdminAction({
      employeeId: report.employeeId,
      action: "report_export_pptx",
      actorTag: "admin",
      payload: {
        reportId,
        filename: result.filename,
      },
    });

    return new NextResponse(result.pptxBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename=\"${encodeURIComponent(result.filename)}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const dbError = resolveDbRouteError(
      error,
      "PPTX 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
    );
    return noStoreJson(
      { ok: false, code: dbError.code, error: dbError.message },
      dbError.status
    );
  }
}
