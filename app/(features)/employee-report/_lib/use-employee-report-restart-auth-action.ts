"use client";

import { useCallback } from "react";
import type {
  ApiErrorPayload,
  EmployeeSyncResponse,
  IdentityInput,
  SyncGuidance,
} from "./client-types";
import {
  ApiRequestError,
  buildSyncGuidance,
  toSyncNextAction,
} from "./client-utils";
import { runRestartAuthFlow } from "./sync-flow";
import type { BusyHint } from "./use-busy-state";

type SyncNextAction = "init" | "sign" | "retry" | null;

type UseEmployeeReportRestartAuthActionInput = {
  validIdentity: boolean;
  debugMode: boolean;
  getIdentityPayload: () => IdentityInput;
  syncEmployeeReport: (
    forceRefresh?: boolean,
    options?: { debugOverride?: boolean }
  ) => Promise<EmployeeSyncResponse>;
  setHasAuthAttempt: (next: boolean) => void;
  setError: (next: string) => void;
  setNotice: (next: string) => void;
  setAdminOnlyReportBlocked: (next: boolean) => void;
  beginBusy: (message: string, hint?: BusyHint) => void;
  endBusy: () => void;
  clearSyncFlowState: (options?: {
    nextAction?: SyncNextAction;
    guidance?: SyncGuidance | null;
    pendingSignForceRefresh?: boolean;
  }) => void;
  setPendingSignGuidance: (message: string, forceRefresh?: boolean) => void;
  applyForceSyncCooldown: (payload: ApiErrorPayload | null | undefined) => void;
  emitB2bSessionSync: (reason: string) => void;
  emitNhisSync: (reason: string) => void;
};

export function useEmployeeReportRestartAuthAction({
  validIdentity,
  debugMode,
  getIdentityPayload,
  syncEmployeeReport,
  setHasAuthAttempt,
  setError,
  setNotice,
  setAdminOnlyReportBlocked,
  beginBusy,
  endBusy,
  clearSyncFlowState,
  setPendingSignGuidance,
  applyForceSyncCooldown,
  emitB2bSessionSync,
  emitNhisSync,
}: UseEmployeeReportRestartAuthActionInput) {
  return useCallback(async () => {
    if (!validIdentity) {
      setError("이름, 생년월일(8자리), 휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }
    setHasAuthAttempt(true);
    beginBusy("카카오톡으로 인증 요청을 보내고 있어요");
    setError("");
    setNotice("");
    setAdminOnlyReportBlocked(false);
    clearSyncFlowState();
    try {
      const restartResult = await runRestartAuthFlow({
        getIdentityPayload,
        syncEmployeeReport,
        debugOverride: debugMode,
      });

      if (restartResult.status === "ready") {
        emitB2bSessionSync("employee-report-restart-ready");
        emitNhisSync("employee-report-restart-ready");
        clearSyncFlowState();
        setNotice("건강정보 연동이 완료됐습니다. 이어서 설문을 진행해 주세요.");
        return;
      }

      setPendingSignGuidance(
        "카카오톡으로 인증을 보냈어요. 카카오톡에서 인증을 완료한 뒤 '카카오톡 인증 완료 후 확인'을 눌러 주세요."
      );
    } catch (err) {
      if (err instanceof ApiRequestError) {
        applyForceSyncCooldown(err.payload);
        const guidance = buildSyncGuidance(
          err.payload,
          err.status,
          "카카오톡 인증 요청에 실패했습니다."
        );
        const nextAction = toSyncNextAction(guidance.nextAction) ?? "retry";
        clearSyncFlowState({ nextAction, guidance });
        setNotice(guidance.message);
      } else {
        clearSyncFlowState({ nextAction: "retry" });
        setError(
          err instanceof Error
            ? err.message
            : "카카오톡 인증 요청에 실패했습니다."
        );
      }
    } finally {
      endBusy();
    }
  }, [
    applyForceSyncCooldown,
    beginBusy,
    clearSyncFlowState,
    debugMode,
    emitB2bSessionSync,
    emitNhisSync,
    endBusy,
    getIdentityPayload,
    setAdminOnlyReportBlocked,
    setError,
    setHasAuthAttempt,
    setNotice,
    setPendingSignGuidance,
    syncEmployeeReport,
    validIdentity,
  ]);
}
