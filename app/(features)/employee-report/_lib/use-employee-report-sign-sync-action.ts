"use client";

import { useCallback } from "react";
import type {
  ApiErrorPayload,
  EmployeeReportResponse,
  EmployeeSyncResponse,
  SyncGuidance,
} from "./client-types";
import {
  buildSyncGuidance,
  resolveSyncCompletionNotice,
  toSyncNextAction,
} from "./client-utils.guidance";
import { formatDateTime } from "./client-utils.format";
import { ApiRequestError } from "./client-utils.request";
import type { NhisReadyResult } from "./sync-flow";
import { runSyncFlowWithRecovery } from "./sync-flow";
import type { BusyHint } from "./use-busy-state";

type SyncNextAction = "init" | "sign" | "retry" | null;

type UseEmployeeReportSignSyncActionInput = {
  validIdentity: boolean;
  debugMode: boolean;
  canUseForceSync: boolean;
  forceSyncRemainingSec: number;
  pendingSignForceRefresh: boolean;
  reportData: EmployeeReportResponse | null;
  ensureNhisReadyForSync: (
    options?: { forceInit?: boolean }
  ) => Promise<NhisReadyResult>;
  syncEmployeeReport: (
    forceRefresh?: boolean,
    options?: { debugOverride?: boolean }
  ) => Promise<EmployeeSyncResponse>;
  tryLoadExistingReport: (options?: {
    successNotice?: string;
    showNotFoundNotice?: boolean;
  }) => Promise<boolean>;
  setHasAuthAttempt: (next: boolean) => void;
  setError: (next: string) => void;
  setNotice: (next: string) => void;
  setAdminOnlyReportBlocked: (next: boolean) => void;
  beginBusy: (message: string, hint?: BusyHint) => void;
  updateBusy: (input: { message?: string; hint?: BusyHint }) => void;
  endBusy: () => void;
  clearLocalIdentityCache: () => void;
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

export function useEmployeeReportSignSyncAction({
  validIdentity,
  debugMode,
  canUseForceSync,
  forceSyncRemainingSec,
  pendingSignForceRefresh,
  reportData,
  ensureNhisReadyForSync,
  syncEmployeeReport,
  tryLoadExistingReport,
  setHasAuthAttempt,
  setError,
  setNotice,
  setAdminOnlyReportBlocked,
  beginBusy,
  updateBusy,
  endBusy,
  clearLocalIdentityCache,
  clearSyncFlowState,
  setPendingSignGuidance,
  applyForceSyncCooldown,
  emitB2bSessionSync,
  emitNhisSync,
}: UseEmployeeReportSignSyncActionInput) {
  return useCallback(
    async (forceRefresh = false) => {
      if (!validIdentity) {
        setError("이름, 생년월일(8자리), 휴대폰 번호를 정확히 입력해 주세요.");
        return;
      }
      setHasAuthAttempt(true);
      if (forceRefresh && !canUseForceSync) {
        setError("강제 조회는 운영자 계정에서만 사용할 수 있습니다.");
        return;
      }
      if (forceRefresh && forceSyncRemainingSec > 0) {
        const availableAtIso = new Date(
          Date.now() + forceSyncRemainingSec * 1000
        ).toISOString();
        setNotice(`재연동은 ${formatDateTime(availableAtIso)} 이후 가능합니다.`);
        return;
      }

      if (forceRefresh) {
        clearLocalIdentityCache();
      }
      setAdminOnlyReportBlocked(false);

      beginBusy(
        forceRefresh
          ? "강제 조회를 준비하고 있어요"
          : "국민건강보험 연동을 준비하고 있어요",
        forceRefresh ? "force-preflight" : "sync-preflight"
      );
      setError("");
      setNotice("");
      clearSyncFlowState();

      const signPendingMessage =
        "카카오톡으로 인증을 보냈어요. 카카오톡에서 인증을 완료한 뒤 '카카오톡 인증 완료 후 확인'을 눌러 주세요.";

      try {
        if (!forceRefresh && !reportData) {
          const reusedExisting = await tryLoadExistingReport({
            successNotice:
              "등록된 조회 기록을 불러왔고, 추가 API 조회 없이 바로 확인할 수 있어요.",
          });
          if (reusedExisting) return;
        }

        const syncEmployeeReportWithBusy: typeof syncEmployeeReport = async (
          nextForceRefresh,
          options
        ) => {
          updateBusy({
            message: nextForceRefresh
              ? "강제 조회로 국민건강보험공단 데이터를 불러오고 있어요"
              : "국민건강보험공단 데이터를 불러오고 있어요",
            hint: nextForceRefresh ? "force-remote" : "sync-remote",
          });
          return syncEmployeeReport(nextForceRefresh, options);
        };

        const syncFlowResult = await runSyncFlowWithRecovery({
          forceRefresh,
          preflightForceInit: forceRefresh && !pendingSignForceRefresh,
          debugOverride: debugMode,
          ensureNhisReadyForSync,
          syncEmployeeReport: syncEmployeeReportWithBusy,
        });
        if (syncFlowResult.status === "pending-sign") {
          setPendingSignGuidance(signPendingMessage, forceRefresh);
          return;
        }

        const { syncResult, ready } = syncFlowResult;

        setNotice(
          resolveSyncCompletionNotice({
            sync: syncResult.sync,
            forceRefresh,
            authReused: ready.reused,
          })
        );
        emitB2bSessionSync("employee-report-sync-success");
        emitNhisSync("employee-report-sync-success");
        clearSyncFlowState();
      } catch (err) {
        if (err instanceof ApiRequestError) {
          applyForceSyncCooldown(err.payload);
          const guidance = buildSyncGuidance(
            err.payload,
            err.status,
            "데이터 연동에 실패했습니다."
          );
          const nextAction = toSyncNextAction(guidance.nextAction) ?? "retry";
          clearSyncFlowState({
            nextAction,
            guidance,
            pendingSignForceRefresh:
              nextAction === "sign" ? forceRefresh : false,
          });
          setNotice(guidance.message);
        } else {
          clearSyncFlowState({ nextAction: "retry" });
          setError(
            err instanceof Error ? err.message : "데이터 연동에 실패했습니다."
          );
        }
      } finally {
        endBusy();
      }
    },
    [
      applyForceSyncCooldown,
      beginBusy,
      canUseForceSync,
      clearLocalIdentityCache,
      clearSyncFlowState,
      debugMode,
      emitB2bSessionSync,
      emitNhisSync,
      endBusy,
      ensureNhisReadyForSync,
      forceSyncRemainingSec,
      pendingSignForceRefresh,
      reportData,
      setAdminOnlyReportBlocked,
      setError,
      setHasAuthAttempt,
      setNotice,
      setPendingSignGuidance,
      syncEmployeeReport,
      tryLoadExistingReport,
      updateBusy,
      validIdentity,
    ]
  );
}
