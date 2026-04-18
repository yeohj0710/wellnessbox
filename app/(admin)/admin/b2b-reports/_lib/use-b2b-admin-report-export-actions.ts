import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { LayoutValidationIssue } from "@/lib/b2b/export/validation-types";
import {
  buildEmployeeReportPdfFilename,
  buildPdfCaptureQuery,
} from "./export-filename";
import type { EmployeeListItem, LatestReport, ReportAudit } from "./client-types";
import { ExportApiError, downloadFromApi } from "./client-utils";
import type { B2bAdminReportRunBusyAction } from "./use-b2b-admin-report-busy-action";

type UseB2bAdminReportExportActionsParams = {
  runBusyAction: B2bAdminReportRunBusyAction;
  latestReport: LatestReport | null;
  selectedEmployee: EmployeeListItem | null;
  selectedPeriodKey: string;
  setNotice: Dispatch<SetStateAction<string>>;
  setError: Dispatch<SetStateAction<string>>;
  setValidationAudit: Dispatch<SetStateAction<ReportAudit | null>>;
  setValidationIssues: Dispatch<SetStateAction<LayoutValidationIssue[]>>;
  setShowExportPreview: Dispatch<SetStateAction<boolean>>;
  webReportCaptureRef: MutableRefObject<HTMLDivElement | null>;
};

export function useB2bAdminReportExportActions({
  runBusyAction,
  latestReport,
  selectedEmployee,
  selectedPeriodKey,
  setNotice,
  setError,
  setValidationAudit,
  setValidationIssues,
  setShowExportPreview,
  webReportCaptureRef,
}: UseB2bAdminReportExportActionsParams) {
  const applyExportFailure = useCallback(
    (err: unknown, fallbackMessage: string) => {
      if (err instanceof ExportApiError) {
        if (err.payload.audit) {
          setValidationAudit(err.payload.audit);
        }
        if (Array.isArray(err.payload.issues)) {
          setValidationIssues(err.payload.issues);
        }
        if (err.payload.audit || (err.payload.issues?.length ?? 0) > 0) {
          setShowExportPreview(true);
        }
        const suffix = err.payload.debugId ? ` (debugId: ${err.payload.debugId})` : "";
        setError(`${err.payload.error || fallbackMessage}${suffix}`);
        return;
      }
      setError(err instanceof Error ? err.message : fallbackMessage);
    },
    [setError, setShowExportPreview, setValidationAudit, setValidationIssues]
  );

  const handleExportPdf = useCallback(async () => {
    if (!latestReport?.id) return;
    await runBusyAction({
      fallbackError: "PDF 다운로드에 실패했습니다.",
      clearNotice: true,
      onError: applyExportFailure,
      run: async () => {
        const downloadFileName = buildEmployeeReportPdfFilename({
          employeeName: selectedEmployee?.name ?? latestReport.payload?.meta?.employeeName,
          periodKey:
            selectedPeriodKey || latestReport.periodKey || latestReport.payload?.meta?.periodKey,
        });
        const captureWidthPx = Math.round(
          webReportCaptureRef.current?.getBoundingClientRect().width ?? 0
        );
        const viewportWidthPx = Math.round(
          window.innerWidth || document.documentElement?.clientWidth || 0
        );
        const queryString = buildPdfCaptureQuery(captureWidthPx, viewportWidthPx);
        const webExportUrl =
          "/api/admin/b2b/reports/" +
          latestReport.id +
          "/export/pdf" +
          (queryString.length > 0 ? `?${queryString}` : "");

        try {
          await downloadFromApi(webExportUrl, downloadFileName);
        } catch (error) {
          const shouldSkipLegacyFallback =
            error instanceof ExportApiError &&
            error.payload.code === "LAYOUT_VALIDATION_FAILED";
          if (shouldSkipLegacyFallback) {
            throw error;
          }

          await downloadFromApi(
            "/api/admin/b2b/reports/" + latestReport.id + "/export/pdf?mode=legacy",
            downloadFileName
          );
        }

        setNotice("PDF 다운로드가 완료되었습니다.");
      },
    });
  }, [
    applyExportFailure,
    latestReport,
    runBusyAction,
    selectedEmployee?.name,
    selectedPeriodKey,
    setNotice,
    webReportCaptureRef,
  ]);

  const handleExportLegacyPdf = useCallback(async () => {
    if (!latestReport?.id) return;
    await runBusyAction({
      fallbackError: "기존 PDF 다운로드에 실패했습니다.",
      clearNotice: true,
      onError: applyExportFailure,
      run: async () => {
        const fallbackPdfName = buildEmployeeReportPdfFilename({
          employeeName: selectedEmployee?.name ?? latestReport.payload?.meta?.employeeName,
          periodKey:
            selectedPeriodKey || latestReport.periodKey || latestReport.payload?.meta?.periodKey,
        });
        await downloadFromApi(
          "/api/admin/b2b/reports/" + latestReport.id + "/export/pdf?mode=legacy",
          fallbackPdfName
        );
        setNotice("기존 PDF 엔진 다운로드가 완료되었습니다.");
      },
    });
  }, [
    applyExportFailure,
    latestReport,
    runBusyAction,
    selectedEmployee?.name,
    selectedPeriodKey,
    setNotice,
  ]);

  return {
    handleExportPdf,
    handleExportLegacyPdf,
  };
}
