import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { convertPptxBufferToPdf } from "@/lib/b2b/export/pdf";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { runB2bReportExport } from "@/lib/b2b/report-service";
import {
  requireAdminReport,
  type B2bReportRouteContext,
} from "@/lib/b2b/admin-report-route";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";

export type { B2bReportRouteContext };

function shouldReturnInstallGuide(reason: string | undefined) {
  if (!reason) return false;
  const normalized = reason.toLowerCase();
  return (
    normalized.includes("playwright is not available") ||
    normalized.includes("soffice fallback is disabled") ||
    normalized.includes("enoent") ||
    normalized.includes("not recognized") ||
    normalized.includes("soffice failed")
  );
}

export async function runAdminReportPdfExport(input: {
  reportId: string;
  employeeId: string;
}) {
  try {
    const result = await runB2bReportExport(input.reportId);
    if (!result.ok) {
      const debugId = randomUUID();
      await logB2bAdminAction({
        employeeId: input.employeeId,
        action: "report_export_pdf_validation_failed",
        actorTag: "admin",
        payload: { debugId, reportId: input.reportId, audit: result.audit },
      });
      return noStoreJson(
        {
          ok: false,
          code: "LAYOUT_VALIDATION_FAILED",
          reason: "layout_validation_failed",
          debugId,
          error:
            "\uB808\uC774\uC544\uC6C3 \uAC80\uC99D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
          audit: result.audit,
          issues: result.issues,
        },
        400
      );
    }

    const conversion = await convertPptxBufferToPdf({
      pptxBuffer: result.pptxBuffer,
      filename: result.filename,
      layout: result.layout,
    });
    if (!conversion.ok) {
      const debugId = randomUUID();
      await logB2bAdminAction({
        employeeId: input.employeeId,
        action: "report_export_pdf_failed",
        actorTag: "admin",
        payload: {
          debugId,
          reportId: input.reportId,
          reason: conversion.reason,
        },
      });
      const status = shouldReturnInstallGuide(conversion.reason) ? 501 : 500;
      return noStoreJson(
        {
          ok: false,
          code: status === 501 ? "PDF_ENGINE_MISSING" : "PDF_CONVERSION_FAILED",
          reason: conversion.reason || "pdf_conversion_failed",
          debugId,
          error:
            status === 501
              ? "PDF \uCD94\uCD9C \uC5D4\uC9C4\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. Playwright \uACBD\uB85C\uB97C \uC124\uC815\uD558\uAC70\uB098 `B2B_ALLOW_PDF_SOFFICE_FALLBACK=1` \uC635\uC158\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694."
              : "\uC11C\uBC84\uC5D0\uC11C PDF \uBCC0\uD658\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
        },
        status
      );
    }

    const pdfFilename = result.filename.replace(/\.pptx$/i, ".pdf");
    await logB2bAdminAction({
      employeeId: input.employeeId,
      action: "report_export_pdf",
      actorTag: "admin",
      payload: {
        reportId: input.reportId,
        filename: pdfFilename,
      },
    });

    return new NextResponse(new Uint8Array(conversion.pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(pdfFilename)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const debugId = randomUUID();
    const dbError = resolveDbRouteError(
      error,
      "PDF \uC0DD\uC131 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694."
    );
    return noStoreJson(
      {
        ok: false,
        code: dbError.code,
        reason: "admin_pdf_export_failed",
        debugId,
        error: dbError.message,
      },
      dbError.status
    );
  }
}

export async function runAdminReportPdfGetRoute(ctx: B2bReportRouteContext) {
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

  return runAdminReportPdfExport({
    reportId: reportResult.reportId,
    employeeId: reportResult.report.employeeId,
  });
}
