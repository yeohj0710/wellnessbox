import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { convertPptxBufferToPdf } from "@/lib/b2b/export/pdf";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { runB2bReportExport } from "@/lib/b2b/report-service";
import { resolveDbRouteError } from "@/lib/server/db-error";
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

function shouldReturnInstallGuide(reason: string | undefined) {
  if (!reason) return false;
  const normalized = reason.toLowerCase();
  return (
    normalized.includes("playwright is not available") ||
    normalized.includes("enoent") ||
    normalized.includes("not recognized") ||
    normalized.includes("soffice failed")
  );
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
      },
    });
    if (!report) {
      return noStoreJson({ ok: false, error: "리포트를 찾을 수 없습니다." }, 404);
    }

    const result = await runB2bReportExport(reportId);
    if (!result.ok) {
      const debugId = randomUUID();
      await logB2bAdminAction({
        employeeId: report.employeeId,
        action: "report_export_pdf_validation_failed",
        actorTag: "admin",
        payload: { debugId, reportId, audit: result.audit },
      });
      return noStoreJson(
        {
          ok: false,
          code: "LAYOUT_VALIDATION_FAILED",
          reason: "layout_validation_failed",
          debugId,
          error: "레이아웃 검증에 실패했습니다.",
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
        employeeId: report.employeeId,
        action: "report_export_pdf_failed",
        actorTag: "admin",
        payload: {
          debugId,
          reportId,
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
              ? "PDF 변환 엔진을 찾지 못했습니다. LibreOffice(soffice) 또는 Playwright 설치가 필요합니다."
              : "서버에서 PDF 변환에 실패했습니다.",
        },
        status
      );
    }

    const pdfFilename = result.filename.replace(/\.pptx$/i, ".pdf");
    await logB2bAdminAction({
      employeeId: report.employeeId,
      action: "report_export_pdf",
      actorTag: "admin",
      payload: {
        reportId,
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
      "PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
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
