import { NextResponse } from "next/server";
import { convertPptxBufferToPdf } from "@/lib/b2b/export/pdf";
import { logB2bEmployeeAccess } from "@/lib/b2b/employee-service";
import { ensureLatestB2bReport, runB2bReportExport } from "@/lib/b2b/report-service";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import { requireB2bEmployeeToken } from "@/lib/server/route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request) {
  const auth = await requireB2bEmployeeToken();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const periodKey = searchParams.get("period") || resolveCurrentPeriodKey();

  const report = await ensureLatestB2bReport(auth.data.employeeId, periodKey);
  const result = await runB2bReportExport(report.id);
  if (!result.ok) {
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
    return noStoreJson(
      {
        ok: false,
        error: "PDF 변환에 실패했습니다.",
        reason: conversion.reason,
      },
      500
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

  return new NextResponse(conversion.pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=\"${encodeURIComponent(pdfFilename)}\"`,
      "Cache-Control": "no-store",
    },
  });
}
