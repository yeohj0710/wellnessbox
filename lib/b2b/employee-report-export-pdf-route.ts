import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { convertPptxBufferToPdf } from "@/lib/b2b/export/pdf";
import { logB2bEmployeeAccess } from "@/lib/b2b/employee-service";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { ensureLatestB2bReport } from "@/lib/b2b/report-service";
import { runB2bReportExport } from "@/lib/b2b/report-service";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";
import { requireB2bEmployeeToken } from "@/lib/server/route-auth";

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

export async function runEmployeeReportPdfExport(input: {
  employeeId: string;
  reportId: string;
  periodKey: string;
  ip: string | null;
  userAgent: string | null;
}) {
  try {
    const result = await runB2bReportExport(input.reportId);
    if (!result.ok) {
      const debugId = randomUUID();
      await logB2bEmployeeAccess({
        employeeId: input.employeeId,
        action: "report_export_pdf_validation_failed",
        route: "/api/b2b/employee/report/export/pdf",
        payload: {
          debugId,
          reportId: input.reportId,
          periodKey: input.periodKey,
          issueCount: result.issues.length,
          selectedStage: result.audit.selectedStage,
        },
        ip: input.ip,
        userAgent: input.userAgent,
      });

      return noStoreJson(
        {
          ok: false,
          code: "LAYOUT_VALIDATION_FAILED",
          reason: "layout_validation_failed",
          debugId,
          error:
            "PDF\uB97C \uC900\uBE44\uD558\uB294 \uC911\uC785\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.",
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
      const status = shouldReturnInstallGuide(conversion.reason) ? 501 : 500;
      return noStoreJson(
        {
          ok: false,
          code: status === 501 ? "PDF_ENGINE_MISSING" : "PDF_CONVERSION_FAILED",
          reason: conversion.reason || "pdf_conversion_failed",
          debugId,
          error:
            status === 501
              ? "PDF \uCD94\uCD9C \uC5D4\uC9C4\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.  PDF \uB3D9\uC77C\uC131\uC744 \uC704\uD574 Playwright \uACBD\uB85C\uAC00 \uD544\uC694\uD558\uBA70, \uC608\uC678\uC801\uC73C\uB85C `B2B_ALLOW_PDF_SOFFICE_FALLBACK=1` \uC124\uC815 \uC2DC soffice fallback\uC744 \uD5C8\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
              : "PDF \uBCC0\uD658\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
        },
        status
      );
    }

    const pdfFilename = result.filename.replace(/\.pptx$/i, ".pdf");
    await logB2bEmployeeAccess({
      employeeId: input.employeeId,
      action: "report_export_pdf",
      route: "/api/b2b/employee/report/export/pdf",
      payload: {
        reportId: input.reportId,
        periodKey: input.periodKey,
        filename: pdfFilename,
      },
      ip: input.ip,
      userAgent: input.userAgent,
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
        reason: "employee_pdf_export_failed",
        debugId,
        error: dbError.message,
      },
      dbError.status
    );
  }
}

export async function runEmployeeReportPdfGetRoute(req: Request) {
  const auth = await requireB2bEmployeeToken();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const periodKey = searchParams.get("period") || resolveCurrentPeriodKey();

  const report = await ensureLatestB2bReport(auth.data.employeeId, periodKey);
  return runEmployeeReportPdfExport({
    employeeId: auth.data.employeeId,
    reportId: report.id,
    periodKey: report.periodKey ?? periodKey,
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });
}
