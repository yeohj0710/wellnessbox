import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
  requireAdminReport,
  type B2bReportRouteContext,
} from "@/lib/b2b/admin-report-route";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { runB2bReportExport } from "@/lib/b2b/report-service";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";

const LAYOUT_VALIDATION_FAILED_ERROR =
  "\uB808\uC774\uC544\uC6C3 \uAC80\uC99D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.";
const PPTX_EXPORT_FAILED_ERROR =
  "PPTX \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.";

export async function runAdminReportPptxExport(input: {
  reportId: string;
  employeeId: string;
}) {
  try {
    const result = await runB2bReportExport(input.reportId);
    if (!result.ok) {
      const debugId = randomUUID();
      await logB2bAdminAction({
        employeeId: input.employeeId,
        action: "report_export_validation_failed",
        actorTag: "admin",
        payload: {
          debugId,
          reportId: input.reportId,
          audit: result.audit,
        },
      });
      return noStoreJson(
        {
          ok: false,
          code: "LAYOUT_VALIDATION_FAILED",
          reason: "layout_validation_failed",
          debugId,
          error: LAYOUT_VALIDATION_FAILED_ERROR,
          audit: result.audit,
          issues: result.issues,
        },
        400
      );
    }

    await logB2bAdminAction({
      employeeId: input.employeeId,
      action: "report_export_pptx",
      actorTag: "admin",
      payload: {
        reportId: input.reportId,
        filename: result.filename,
      },
    });

    return new NextResponse(new Uint8Array(result.pptxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(result.filename)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const debugId = randomUUID();
    const dbError = resolveDbRouteError(error, PPTX_EXPORT_FAILED_ERROR);
    return noStoreJson(
      {
        ok: false,
        code: dbError.code,
        reason: "admin_pptx_export_failed",
        debugId,
        error: dbError.message,
      },
      dbError.status
    );
  }
}

export async function runAdminReportPptxGetRoute(ctx: B2bReportRouteContext) {
  const reportResult = await requireAdminReport(ctx, (reportId) =>
    db.b2bReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        employeeId: true,
      },
    })
  );
  if (!reportResult.ok) return reportResult.response;

  return runAdminReportPptxExport({
    reportId: reportResult.reportId,
    employeeId: reportResult.report.employeeId,
  });
}
