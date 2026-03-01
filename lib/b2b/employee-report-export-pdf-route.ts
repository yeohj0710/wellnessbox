import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { convertPptxBufferToPdf } from "@/lib/b2b/export/pdf";
import { exportPdfFromWebRoute } from "@/lib/b2b/export/web-route-pdf";
import { logB2bEmployeeAccess } from "@/lib/b2b/employee-service";
import { resolveCurrentPeriodKey } from "@/lib/b2b/period";
import {
  ensureLatestB2bReport,
  runB2bReportExport,
} from "@/lib/b2b/report-service";
import type { ReportSummaryPayload } from "@/lib/b2b/report-summary-payload";
import { resolveDbRouteError } from "@/lib/server/db-error";
import { noStoreJson } from "@/lib/server/no-store";
import { requireB2bEmployeeToken } from "@/lib/server/route-auth";

type EmployeeReportPdfMode = "web" | "legacy";

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

function resolvePdfMode(req: Request): EmployeeReportPdfMode {
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

function buildPdfFilename(payload: unknown, periodKey: string) {
  const reportPayload = payload as ReportSummaryPayload | null | undefined;
  const employeeLabel = normalizeFilenameToken(reportPayload?.meta?.employeeName, "직원");
  const periodLabel = normalizeFilenameToken(reportPayload?.meta?.periodKey, periodKey);
  return `웰니스박스_건강리포트_${employeeLabel}_${periodLabel}.pdf`;
}

async function runLegacyEmployeeReportPdfExport(input: {
  employeeId: string;
  reportId: string;
  periodKey: string;
  ip: string | null;
  userAgent: string | null;
}) {
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
        engine: "legacy",
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
            ? "PDF 추출 엔진을 사용할 수 없습니다. PDF 동일성을 위해 Playwright 경로가 필요하며, 예외적으로 `B2B_ALLOW_PDF_SOFFICE_FALLBACK=1` 설정 시 soffice fallback을 허용할 수 있습니다."
            : "PDF 변환에 실패했습니다.",
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
      engine: "legacy",
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
}

async function runWebEmployeeReportPdfExport(input: {
  req: Request;
  employeeId: string;
  reportId: string;
  periodKey: string;
  captureWidthPx: number | null;
  captureViewportWidthPx: number | null;
  reportPayload: unknown;
  ip: string | null;
  userAgent: string | null;
}) {
  const origin = resolveRequestOrigin(input.req);
  const exportViewUrl = new URL("/employee-report/export-view", origin);
  exportViewUrl.searchParams.set("period", input.periodKey);
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
            : "PDF 변환에 실패했습니다.",
      },
      status
    );
  }

  const pdfFilename = buildPdfFilename(input.reportPayload, input.periodKey);
  await logB2bEmployeeAccess({
    employeeId: input.employeeId,
    action: "report_export_pdf",
    route: "/api/b2b/employee/report/export/pdf",
    payload: {
      reportId: input.reportId,
      periodKey: input.periodKey,
      filename: pdfFilename,
      engine: "web",
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
}

export async function runEmployeeReportPdfExport(input: {
  req: Request;
  mode: EmployeeReportPdfMode;
  employeeId: string;
  reportId: string;
  periodKey: string;
  captureWidthPx: number | null;
  captureViewportWidthPx: number | null;
  reportPayload: unknown;
  ip: string | null;
  userAgent: string | null;
}) {
  try {
    if (input.mode === "legacy") {
      return await runLegacyEmployeeReportPdfExport({
        employeeId: input.employeeId,
        reportId: input.reportId,
        periodKey: input.periodKey,
        ip: input.ip,
        userAgent: input.userAgent,
      });
    }

    return await runWebEmployeeReportPdfExport({
      req: input.req,
      employeeId: input.employeeId,
      reportId: input.reportId,
      periodKey: input.periodKey,
      captureWidthPx: input.captureWidthPx,
      captureViewportWidthPx: input.captureViewportWidthPx,
      reportPayload: input.reportPayload,
      ip: input.ip,
      userAgent: input.userAgent,
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

export async function runEmployeeReportPdfGetRoute(req: Request) {
  const auth = await requireB2bEmployeeToken();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const periodKey = searchParams.get("period") || resolveCurrentPeriodKey();
  const mode = resolvePdfMode(req);
  const captureWidthPx = resolveCaptureWidth(req);
  const captureViewportWidthPx = resolveCaptureViewportWidth(req);

  const report = await ensureLatestB2bReport(auth.data.employeeId, periodKey);
  return runEmployeeReportPdfExport({
    req,
    mode,
    employeeId: auth.data.employeeId,
    reportId: report.id,
    periodKey: report.periodKey ?? periodKey,
    captureWidthPx,
    captureViewportWidthPx,
    reportPayload: report.reportPayload,
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });
}
