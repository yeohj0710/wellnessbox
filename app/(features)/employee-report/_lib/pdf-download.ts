"use client";

import { captureElementToPdf } from "@/lib/client/capture-pdf";
import type { EmployeeReportResponse } from "./client-types";
import {
  downloadPdf,
  isPdfEngineUnavailableFailure,
} from "./client-utils.pdf";
import type { BusyHint } from "./use-busy-state";

type DownloadResult = { ok: true; notice: string } | { ok: false; error: string };

type CaptureAttemptResult = {
  attempted: boolean;
  success: boolean;
  errorMessage: string | null;
};

type CaptureSuccessResult = { ok: true; notice: string };

type BusyUpdater = (input: { message: string; hint: BusyHint }) => void;

function normalizeFilenameToken(value: string | null | undefined, fallback: string) {
  const text = (value ?? "")
    .trim()
    .replace(/[\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 0 ? text : fallback;
}

function resolvePdfFilename(input: {
  reportData: EmployeeReportResponse;
  selectedPeriodKey: string;
}) {
  const employeeLabel = normalizeFilenameToken(
    input.reportData.employee?.name ??
      input.reportData.report?.payload?.meta?.employeeName,
    "직원"
  );
  const periodLabel = normalizeFilenameToken(
    input.selectedPeriodKey ||
      input.reportData.periodKey ||
      input.reportData.report?.payload?.meta?.periodKey,
    "최근"
  );
  return `웰니스박스_건강리포트_${employeeLabel}_${periodLabel}.pdf`;
}

function toPdfErrorPayload(error: unknown) {
  if (error && typeof error === "object" && "payload" in error) {
    return (
      (error as { payload?: { code?: string; reason?: string; error?: string } })
        .payload ?? {}
    );
  }
  return {
    error: error instanceof Error ? error.message : null,
  };
}

function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function tryBrowserCapture(input: {
  target: HTMLDivElement | null;
  fileName: string;
  viewportWidthPx: number;
  busyMessage: string;
  noticeMessage: string;
  updateBusy: BusyUpdater;
}): Promise<CaptureSuccessResult | CaptureAttemptResult> {
  if (!input.target) {
    return {
      attempted: false,
      success: false,
      errorMessage: null,
    };
  }

  try {
    input.updateBusy({
      message: input.busyMessage,
      hint: "sync-remote",
    });
    await captureElementToPdf({
      element: input.target,
      fileName: input.fileName,
      desktopViewportWidth:
        input.viewportWidthPx > 0 ? input.viewportWidthPx : undefined,
    });
    return {
      ok: true,
      notice: input.noticeMessage,
    };
  } catch (captureError) {
    return {
      attempted: true,
      success: false,
      errorMessage: toErrorMessage(captureError, "PDF 다운로드에 실패했습니다."),
    };
  }
}

export async function downloadEmployeeReportPdf(input: {
  reportData: EmployeeReportResponse;
  selectedPeriodKey: string;
  captureTarget: HTMLDivElement | null;
  updateBusy: BusyUpdater;
}): Promise<DownloadResult> {
  const fileName = resolvePdfFilename({
    reportData: input.reportData,
    selectedPeriodKey: input.selectedPeriodKey,
  });
  const query = new URLSearchParams();
  if (input.selectedPeriodKey) {
    query.set("period", input.selectedPeriodKey);
  }

  const captureWidthPx = Math.round(
    input.captureTarget?.getBoundingClientRect().width ?? 0
  );
  if (captureWidthPx > 0) {
    query.set("w", String(captureWidthPx));
  }

  const viewportWidthPx = Math.round(
    window.innerWidth || document.documentElement?.clientWidth || 0
  );
  if (viewportWidthPx > 0) {
    query.set("vw", String(viewportWidthPx));
  }

  const shouldPreferBrowserCapture =
    !!input.captureTarget && viewportWidthPx > 0 && viewportWidthPx <= 900;

  if (shouldPreferBrowserCapture) {
    const captureResult = await tryBrowserCapture({
      target: input.captureTarget,
      fileName,
      viewportWidthPx,
      busyMessage: "화면 그대로 PDF를 저장하고 있어요.",
      noticeMessage: "PDF 저장이 완료되었어요.",
      updateBusy: input.updateBusy,
    });
    if ("ok" in captureResult && captureResult.ok) {
      return captureResult;
    }
  }

  try {
    const queryString = query.toString();
    await downloadPdf(
      "/api/b2b/employee/report/export/pdf" +
        (queryString.length > 0 ? `?${queryString}` : ""),
      fileName
    );
    return {
      ok: true,
      notice: "PDF 다운로드가 완료되었어요.",
    };
  } catch (error) {
    const payload = toPdfErrorPayload(error);
    if (isPdfEngineUnavailableFailure(payload)) {
      const captureResult = await tryBrowserCapture({
        target: input.captureTarget,
        fileName,
        viewportWidthPx,
        busyMessage: "화면 그대로 PDF를 저장하고 있어요.",
        noticeMessage: "PDF 저장이 완료되었어요.",
        updateBusy: input.updateBusy,
      });
      if ("ok" in captureResult && captureResult.ok) {
        return captureResult;
      }
      if (
        "attempted" in captureResult &&
        captureResult.attempted &&
        captureResult.errorMessage
      ) {
        return { ok: false, error: captureResult.errorMessage };
      }
    }

    return {
      ok: false,
      error: toErrorMessage(error, "PDF 다운로드에 실패했습니다."),
    };
  }
}

export async function downloadEmployeeReportLegacyPdf(input: {
  reportData: EmployeeReportResponse;
  selectedPeriodKey: string;
}): Promise<DownloadResult> {
  const query = new URLSearchParams();
  query.set("mode", "legacy");
  if (input.selectedPeriodKey) {
    query.set("period", input.selectedPeriodKey);
  }

  const fileName = resolvePdfFilename({
    reportData: input.reportData,
    selectedPeriodKey: input.selectedPeriodKey,
  });

  try {
    await downloadPdf(
      "/api/b2b/employee/report/export/pdf?" + query.toString(),
      fileName
    );
    return {
      ok: true,
      notice: "PDF 다운로드가 완료되었어요.",
    };
  } catch (error) {
    return {
      ok: false,
      error: toErrorMessage(error, "기존 PDF 다운로드에 실패했습니다."),
    };
  }
}
