import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { convertPptxBufferToPdf } from "@/lib/b2b/export/pdf";
import { exportPdfFromWebRoute } from "@/lib/b2b/export/web-route-pdf";
import { logB2bAdminAction } from "@/lib/b2b/employee-service";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import { runB2bReportExport } from "@/lib/b2b/report-service";
import {
  requireAdminReport,
  type B2bReportRouteContext,
} from "@/lib/b2b/admin-report-route";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";

export type { B2bReportRouteContext };

type AdminReportPdfMode = "web" | "legacy";

function allowLegacyPdfMode() {
  const raw = (process.env.B2B_ENABLE_LEGACY_PDF_EXPORT || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "y";
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

function resolvePdfMode(req: Request): AdminReportPdfMode {
  const mode = new URL(req.url).searchParams.get("mode")?.trim().toLowerCase();
  if (mode === "legacy" && allowLegacyPdfMode()) return "legacy";
  return "web";
}

function resolveCaptureWidth(req: Request) {
  const raw = new URL(req.url).searchParams.get("w")?.trim();
  if (!raw || !/^\d{3,4}$/.test(raw)) return null;
  const width = Number(raw);
  if (!Number.isFinite(width)) return null;
  return Math.min(1400, Math.max(280, Math.round(width)));
}

function resolveCaptureViewportWidth(req: Request) {
  const raw = new URL(req.url).searchParams.get("vw")?.trim();
  if (!raw || !/^\d{3,4}$/.test(raw)) return null;
  const width = Number(raw);
  if (!Number.isFinite(width)) return null;
  return Math.min(2560, Math.max(280, Math.round(width)));
}

function resolveRequestOrigin(req: Request) {
  const url = new URL(req.url);
  if (url.origin && url.origin !== "null") return url.origin;

  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  if (host) return `${proto}://${host}`;

  const fallbackOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3001";
  return fallbackOrigin.replace(/\/+$/, "");
}

function normalizeFilenameToken(value: string | null | undefined, fallback: string) {
  const normalized = (value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : fallback;
}

function buildPdfFilename(payload: unknown, periodKey: string | null) {
  const reportPayload = payload as ReportSummaryPayload | null | undefined;
  const employeeLabel = normalizeFilenameToken(reportPayload?.meta?.employeeName, "직원");
  const periodLabel = normalizeFilenameToken(
    reportPayload?.meta?.periodKey,
    periodKey || "최근"
  );
  return `웰니스박스_건강리포트_${employeeLabel}_${periodLabel}.pdf`;
}

async function runLegacyAdminReportPdfExport(input: {
  reportId: string;
  employeeId: string;
}) {
  const result = await runB2bReportExport(input.reportId);
  if (!result.ok) {
    const debugId = randomUUID();
    await logB2bAdminAction({
      employeeId: input.employeeId,
      action: "report_export_pdf_validation_failed",
      actorTag: "admin",
      payload: {
        debugId,
        reportId: input.reportId,
        audit: result.audit,
        engine: "legacy",
      },
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
      employeeId: input.employeeId,
      action: "report_export_pdf_failed",
      actorTag: "admin",
      payload: {
        debugId,
        reportId: input.reportId,
        reason: conversion.reason,
        engine: "legacy",
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
            ? "PDF 추출 엔진을 사용할 수 없습니다. Playwright 경로를 설정하거나 `B2B_ALLOW_PDF_SOFFICE_FALLBACK=1` 옵션을 확인해 주세요."
            : "서버에서 PDF 변환에 실패했습니다.",
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
      engine: "legacy",
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
}

async function runWebAdminReportPdfExport(input: {
  req: Request;
  reportId: string;
  employeeId: string;
  periodKey: string | null;
  captureWidthPx: number | null;
  captureViewportWidthPx: number | null;
  reportPayload: unknown;
}) {
  const origin = resolveRequestOrigin(input.req);
  const exportViewUrl = new URL(
    `/admin/b2b-reports/export-view/${encodeURIComponent(input.reportId)}`,
    origin
  );
  if (input.captureWidthPx) {
    exportViewUrl.searchParams.set("w", String(input.captureWidthPx));
  }
  if (input.captureViewportWidthPx) {
    exportViewUrl.searchParams.set("vw", String(input.captureViewportWidthPx));
  }

  const conversion = await exportPdfFromWebRoute({
    url: exportViewUrl.toString(),
    cookieHeader: input.req.headers.get("cookie"),
    waitForTestId: "report-capture-surface",
    viewportWidthPx: input.captureViewportWidthPx,
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
        engine: "web",
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
            ? "PDF 추출 엔진을 사용할 수 없습니다. Playwright 환경을 확인해 주세요."
            : "서버에서 PDF 변환에 실패했습니다.",
      },
      status
    );
  }

  const pdfFilename = buildPdfFilename(input.reportPayload, input.periodKey);
  await logB2bAdminAction({
    employeeId: input.employeeId,
    action: "report_export_pdf",
    actorTag: "admin",
    payload: {
      reportId: input.reportId,
      filename: pdfFilename,
      engine: "web",
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
}

export async function runAdminReportPdfExport(input: {
  req: Request;
  mode: AdminReportPdfMode;
  reportId: string;
  employeeId: string;
  periodKey: string | null;
  captureWidthPx: number | null;
  captureViewportWidthPx: number | null;
  reportPayload: unknown;
}) {
  try {
    if (input.mode === "legacy") {
      return await runLegacyAdminReportPdfExport({
        reportId: input.reportId,
        employeeId: input.employeeId,
      });
    }

    return await runWebAdminReportPdfExport({
      req: input.req,
      reportId: input.reportId,
      employeeId: input.employeeId,
      periodKey: input.periodKey,
      captureWidthPx: input.captureWidthPx,
      captureViewportWidthPx: input.captureViewportWidthPx,
      reportPayload: input.reportPayload,
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

export async function runAdminReportPdfGetRoute(
  req: Request,
  ctx: B2bReportRouteContext
) {
  const reportResult = await requireAdminReport(ctx, (reportId) =>
    db.b2bReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        employeeId: true,
        periodKey: true,
        reportPayload: true,
      },
    })
  );
  if (!reportResult.ok) return reportResult.response;

  return runAdminReportPdfExport({
    req,
    mode: resolvePdfMode(req),
    reportId: reportResult.reportId,
    employeeId: reportResult.report.employeeId,
    periodKey: reportResult.report.periodKey,
    captureWidthPx: resolveCaptureWidth(req),
    captureViewportWidthPx: resolveCaptureViewportWidth(req),
    reportPayload: reportResult.report.reportPayload,
  });
}
