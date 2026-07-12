"use client";

import { useCallback } from "react";
import type { EmployeeWorkspaceResponse } from "./client-types";

type LoadWorkspace = (input?: {
  reportId?: string | null;
  preserveSurvey?: boolean;
  driveSync?: boolean;
}) => Promise<EmployeeWorkspaceResponse>;
type PendingAction = "start" | "health" | "refresh" | "report" | "sign" | null;
type OptimisticHealthState = "checking" | "refreshing" | "verifying" | null;

type UseEmployeeReportReportActionsInput = {
  loadWorkspace: LoadWorkspace;
  selectedReportId: string | null;
  showSurvey: boolean;
  showHealthSyncModal: boolean;
  workspaceSyncActive: boolean;
  isAwaitingKakaoAuth: boolean;
  setPendingAction: (next: PendingAction) => void;
  setOptimisticHealthState: (next: OptimisticHealthState) => void;
  setBusy: (next: boolean) => void;
  setError: (next: string) => void;
  setPollingError: (next: string) => void;
  setSelectedReportId: (next: string | null) => void;
  setShowSurvey: (next: boolean) => void;
  setNotice: (next: string) => void;
  setPolling: (next: boolean) => void;
};

export function useEmployeeReportReportActions(input: UseEmployeeReportReportActionsInput) {
  const handleSelectReport = useCallback(async (nextReportId: string) => {
    input.setPendingAction("report");
    input.setBusy(true);
    input.setError("");
    try {
      const nextWorkspace = await input.loadWorkspace({
        reportId: nextReportId || null,
        preserveSurvey: false,
      });
      input.setSelectedReportId(nextWorkspace.selectedReportId ?? null);
    } catch (error) {
      input.setError(error instanceof Error ? error.message : "선택한 리포트를 불러오지 못했습니다.");
    } finally {
      input.setPendingAction(null);
      input.setBusy(false);
    }
  }, [input]);

  const handleSurveyCompleted = useCallback(async (_periodKey: string | null) => {
    input.setShowSurvey(false);
    input.setSelectedReportId(null);
    input.setNotice("설문이 저장되었어요. 리포트를 새로 확인하고 있어요.");
    input.setPolling(true);
    try {
      const nextWorkspace = await input.loadWorkspace({ reportId: null });
      if (!nextWorkspace.currentStatus?.ready && nextWorkspace.sync?.active !== true) {
        input.setNotice("설문은 저장됐어요. 이제 건강 정보 확인을 시작하면 최신 리포트가 준비됩니다.");
      }
    } catch (error) {
      input.setError(error instanceof Error ? error.message : "최신 리포트를 다시 불러오지 못했습니다.");
    }
  }, [input]);

  const handleRefreshWorkspace = useCallback(async () => {
    input.setPendingAction("refresh");
    input.setOptimisticHealthState(input.isAwaitingKakaoAuth ? "verifying" : "refreshing");
    input.setBusy(true);
    input.setError("");
    input.setPollingError("");
    try {
      await input.loadWorkspace({
        reportId: input.selectedReportId,
        preserveSurvey: input.showSurvey,
        driveSync: input.showHealthSyncModal || input.workspaceSyncActive,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "최신 상태를 불러오지 못했습니다.";
      if (input.workspaceSyncActive) input.setPollingError(message);
      else input.setError(message);
    } finally {
      input.setPendingAction(null);
      input.setOptimisticHealthState(null);
      input.setBusy(false);
    }
  }, [input]);

  return { handleSelectReport, handleSurveyCompleted, handleRefreshWorkspace };
}
