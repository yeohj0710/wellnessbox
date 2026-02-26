import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { convertPptxBufferToPdf } from "@/lib/b2b/export/pdf";
import { logB2bEmployeeAccess } from "@/lib/b2b/employee-service";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { ensureLatestB2bReport, runB2bReportExport } from "@/lib/b2b/report-service";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { requireB2bEmployeeToken } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

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

export async function GET(req: Request) {
  try {
    const auth = await requireB2bEmployeeToken();
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const periodKey = searchParams.get("period") || resolveCurrentPeriodKey();

    const report = await ensureLatestB2bReport(auth.data.employeeId, periodKey);
    const result = await runB2bReportExport(report.id);
    if (!result.ok) {
      const debugId = randomUUID();
      await logB2bEmployeeAccess({
        employeeId: auth.data.employeeId,
        action: "report_export_pdf_validation_failed",
        route: "/api/b2b/employee/report/export/pdf",
        payload: {
          debugId,
          reportId: report.id,
          periodKey: report.periodKey ?? periodKey,
          issueCount: result.issues.length,
          selectedStage: result.audit.selectedStage,
        },
        ip: req.headers.get("x-forwarded-for"),
        userAgent: req.headers.get("user-agent"),
      });

      return noStoreJson(
        {
          ok: false,
          code: "LAYOUT_VALIDATION_FAILED",
          reason: "layout_validation_failed",
          debugId,
          error: "PDF를 준비하는 중입니다. 잠시 후 다시 시도해 주세요.",
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
              ? "PDF 추출 엔진을 사용할 수 없습니다. 웹/PDF 동일성을 위해 Playwright 경로가 필요하며, 예외적으로 `B2B_ALLOW_PDF_SOFFICE_FALLBACK=1` 설정 시 soffice fallback을 허용할 수 있습니다."
              : "PDF 변환에 실패했습니다.",
        },
        status
      );
    }

    const pdfFilename = result.filename.replace(/\.pptx$/i, ".pdf");
    await logB2bEmployeeAccess({
      employeeId: auth.data.employeeId,
      action: "report_export_pdf",
      route: "/api/b2b/employee/report/export/pdf",
      payload: {
        reportId: report.id,
        periodKey: report.periodKey ?? periodKey,
        filename: pdfFilename,
      },
      ip: req.headers.get("x-forwarded-for"),
      userAgent: req.headers.get("user-agent"),
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
      "PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
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
