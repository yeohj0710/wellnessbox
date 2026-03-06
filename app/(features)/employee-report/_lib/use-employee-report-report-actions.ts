"use client";

import { useCallback, type MutableRefObject } from "react";
import { deleteEmployeeSession, requestNhisUnlink } from "./api";
import type { EmployeeReportResponse } from "./client-types";
import {
  downloadEmployeeReportLegacyPdf,
  downloadEmployeeReportPdf,
} from "./pdf-download";
import type { BusyHint } from "./use-busy-state";

type UseEmployeeReportReportActionsInput = {
  reportData: EmployeeReportResponse | null;
  selectedPeriodKey: string;
  webReportCaptureRef: MutableRefObject<HTMLDivElement | null>;
  beginBusy: (message: string, hint?: BusyHint) => void;
  updateBusy: (input: { message?: string; hint?: BusyHint }) => void;
  endBusy: () => void;
  loadReport: (periodKey?: string) => Promise<void>;
  resetReportState: () => void;
  clearSyncFlowState: () => void;
  clearLocalIdentityCache: () => void;
  setError: (next: string) => void;
  setNotice: (next: string) => void;
  setSelectedPeriodKey: (next: string) => void;
  setForceConfirmOpen: (next: boolean) => void;
  setForceConfirmText: (next: string) => void;
  setForceConfirmChecked: (next: boolean) => void;
  emitB2bSessionSync: (reason: string) => void;
  emitNhisSync: (reason: string) => void;
};

export function useEmployeeReportReportActions({
  reportData,
  selectedPeriodKey,
  webReportCaptureRef,
  beginBusy,
  updateBusy,
  endBusy,
  loadReport,
  resetReportState,
  clearSyncFlowState,
  clearLocalIdentityCache,
  setError,
  setNotice,
  setSelectedPeriodKey,
  setForceConfirmOpen,
  setForceConfirmText,
  setForceConfirmChecked,
  emitB2bSessionSync,
  emitNhisSync,
}: UseEmployeeReportReportActionsInput) {
  const handleDownloadPdf = useCallback(async () => {
    if (!reportData?.report?.id) return;

    beginBusy("PDF 파일을 생성하고 있어요");
    setError("");
    setNotice("");

    try {
      const result = await downloadEmployeeReportPdf({
        reportData,
        selectedPeriodKey,
        captureTarget: webReportCaptureRef.current,
        updateBusy,
      });
      if (result.ok) {
        setNotice(result.notice);
      } else {
        setError(result.error);
      }
    } finally {
      endBusy();
    }
  }, [
    beginBusy,
    endBusy,
    reportData,
    selectedPeriodKey,
    setError,
    setNotice,
    updateBusy,
    webReportCaptureRef,
  ]);

  const handleDownloadLegacyPdf = useCallback(async () => {
    if (!reportData?.report?.id) return;
    beginBusy("기존 PDF 엔진으로 파일을 생성하고 있어요");
    setError("");
    setNotice("");
    try {
      const result = await downloadEmployeeReportLegacyPdf({
        reportData,
        selectedPeriodKey,
      });
      if (result.ok) {
        setNotice(result.notice);
      } else {
        setError(result.error);
      }
    } finally {
      endBusy();
    }
  }, [
    beginBusy,
    endBusy,
    reportData,
    selectedPeriodKey,
    setError,
    setNotice,
  ]);

  const handleLogout = useCallback(async () => {
    beginBusy("연동 세션을 해제하고 있어요");
    setError("");
    try {
      await deleteEmployeeSession();
      await requestNhisUnlink().catch(() => null);
      clearLocalIdentityCache();
      resetReportState();
      clearSyncFlowState();
      setForceConfirmOpen(false);
      setForceConfirmText("");
      setForceConfirmChecked(false);
      emitB2bSessionSync("employee-report-logout");
      emitNhisSync("employee-report-logout");
      setNotice("현재 연결된 조회 세션을 해제했습니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "세션 해제에 실패했습니다.");
    } finally {
      endBusy();
    }
  }, [
    beginBusy,
    clearLocalIdentityCache,
    clearSyncFlowState,
    emitB2bSessionSync,
    emitNhisSync,
    endBusy,
    resetReportState,
    setError,
    setForceConfirmChecked,
    setForceConfirmOpen,
    setForceConfirmText,
    setNotice,
  ]);

  const handleChangePeriod = useCallback(
    async (nextPeriod: string) => {
      setSelectedPeriodKey(nextPeriod);
      beginBusy("선택한 기간 리포트를 불러오고 있어요");
      setError("");
      try {
        await loadReport(nextPeriod);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "선택한 기간 조회에 실패했습니다."
        );
      } finally {
        endBusy();
      }
    },
    [beginBusy, endBusy, loadReport, setError, setSelectedPeriodKey]
  );

  return {
    handleDownloadPdf,
    handleDownloadLegacyPdf,
    handleLogout,
    handleChangePeriod,
  };
}
