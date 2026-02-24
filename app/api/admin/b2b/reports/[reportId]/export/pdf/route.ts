import { NextResponse } from "next/server";
import db from "@/lib/db";
import { convertPptxBufferToPdf } from "@/lib/b2b/export/pdf";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import { runB2bReportExport } from "@/lib/b2b/report-service";
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
    },
  });
  if (!report) {
    return noStoreJson({ ok: false, error: "리포트를 찾을 수 없습니다." }, 404);
  }

  const result = await runB2bReportExport(reportId);
  if (!result.ok) {
    await logB2bAdminAction({
      employeeId: report.employeeId,
      action: "report_export_pdf_validation_failed",
      actorTag: "admin",
      payload: { reportId, audit: result.audit },
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

  const conversion = await convertPptxBufferToPdf({
    pptxBuffer: result.pptxBuffer,
    filename: result.filename,
    layout: result.layout,
  });
  if (!conversion.ok) {
    await logB2bAdminAction({
      employeeId: report.employeeId,
      action: "report_export_pdf_failed",
      actorTag: "admin",
      payload: {
        reportId,
        reason: conversion.reason,
      },
    });
    return noStoreJson(
      {
        ok: false,
        error:
          "서버에서 PDF 변환에 실패했습니다. LibreOffice(soffice) 설치 상태를 확인해 주세요.",
        reason: conversion.reason,
      },
      501
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

  return new NextResponse(conversion.pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${encodeURIComponent(pdfFilename)}\"`,
      "Cache-Control": "no-store",
    },
  });
}
