"use client";

import { useCallback } from "react";
import { emitAuthSyncEvent } from "@/lib/client/auth-sync";
import { requestNhisSign, startEmployeeWorkspace } from "./api";
import type { EmployeeWorkspaceResponse, IdentityInput } from "./client-types";
import { saveStoredIdentity } from "./client-utils.identity";

type PendingAction = "start" | "health" | "refresh" | "report" | "sign" | null;
type OptimisticHealthState = "checking" | "refreshing" | "verifying" | null;
type LoadWorkspace = (input?: { reportId?: string | null; preserveSurvey?: boolean; driveSync?: boolean }) => Promise<EmployeeWorkspaceResponse>;

type UseEmployeeReportSyncActionsInput = {
  identity: IdentityInput;
  validIdentity: boolean;
  selectedReportId: string | null;
  applyWorkspace: (next: EmployeeWorkspaceResponse | null) => void;
  loadWorkspace: LoadWorkspace;
  clearSurveyDraft: () => void;
  setPendingAction: (next: PendingAction) => void;
  setOptimisticHealthState: (next: OptimisticHealthState) => void;
  setShowHealthSyncModal: (next: boolean) => void;
  setShowSurvey: (next: boolean) => void;
  setBusy: (next: boolean) => void;
  setError: (next: string) => void;
  setPollingError: (next: string) => void;
  setNotice: (next: string) => void;
  setPolling: (next: boolean) => void;
};

export function useEmployeeReportSyncActions(input: UseEmployeeReportSyncActionsInput) {
  const handleStartWorkspace = useCallback(async (options?: { restartHealth?: boolean }) => {
    if (!input.validIdentity) {
      input.setError("이름, 생년월일 8자리, 전화번호를 정확히 입력해 주세요.");
      return;
    }

    input.setPendingAction(options?.restartHealth ? "health" : "start");
    input.setOptimisticHealthState("checking");
    input.setShowHealthSyncModal(true);
    input.setShowSurvey(false);
    input.setBusy(true);
    input.setError("");
    input.setPollingError("");
    input.setNotice("");

    try {
      const next = await startEmployeeWorkspace({
        identity: input.identity,
        restartHealth: options?.restartHealth === true,
      });
      emitAuthSyncEvent({ scope: "b2b-employee-session", reason: "employee-report-start" });
      emitAuthSyncEvent({ scope: "nhis-link", reason: "employee-report-health-start" });
      saveStoredIdentity(input.identity);
      input.applyWorkspace(next);
      if (options?.restartHealth) {
        input.setNotice("건강 정보를 다시 확인하고 있어요. 준비되면 이 화면에서 이어서 볼 수 있습니다.");
      } else if (next.currentStatus?.hasAnyWorkspaceData) {
        input.setNotice("이전에 확인한 내용을 불러왔어요.");
      } else {
        input.clearSurveyDraft();
        input.setNotice(next.scheduledHealthSync
          ? "건강 정보 확인을 백그라운드에서 시작했어요. 아래에서 진행 상황을 보면서 설문도 이어서 작성할 수 있어요."
          : "기록을 확인했어요. 건강 정보 확인이나 설문 중 원하는 단계부터 진행해 주세요.");
      }
    } catch (error) {
      input.setError(error instanceof Error ? error.message : "리포트를 시작하지 못했습니다.");
    } finally {
      input.setPendingAction(null);
      input.setOptimisticHealthState(null);
      input.setBusy(false);
    }
  }, [input]);

  const handleConfirmKakaoAuth = useCallback(async () => {
    input.setPendingAction("sign");
    input.setOptimisticHealthState("verifying");
    input.setShowHealthSyncModal(true);
    input.setShowSurvey(false);
    input.setError("");
    input.setPollingError("");
    input.setBusy(true);
    try {
      const signResult = await requestNhisSign();
      emitAuthSyncEvent({ scope: "nhis-link", reason: "employee-report-sign-check" });
      if (!signResult.linked) {
        input.setPollingError("카카오톡 인증 완료가 아직 확인되지 않았어요. 휴대폰에서 인증을 마친 뒤 다시 눌러 주세요.");
        return;
      }
      input.setPolling(true);
      await input.loadWorkspace({ reportId: input.selectedReportId, preserveSurvey: false, driveSync: true });
    } catch (error) {
      input.setPollingError(error instanceof Error ? error.message : "카카오톡 인증 완료 여부를 확인하지 못했습니다.");
    } finally {
      input.setPendingAction(null);
      input.setOptimisticHealthState(null);
      input.setBusy(false);
    }
  }, [input]);

  return { handleStartWorkspace, handleConfirmKakaoAuth };
}
