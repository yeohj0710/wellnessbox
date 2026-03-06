"use client";

import { useCallback } from "react";
import type {
  ApiErrorPayload,
  EmployeeReportResponse,
  EmployeeSyncResponse,
  IdentityInput,
  SyncGuidance,
} from "./client-types";
import { useEmployeeReportRestartAuthAction } from "./use-employee-report-restart-auth-action";
import { useEmployeeReportSignSyncAction } from "./use-employee-report-sign-sync-action";
import {
  ensureNhisReadyForSync as ensureNhisReadyForSyncFlow,
} from "./sync-flow";
import type { BusyHint } from "./use-busy-state";

type SyncNextAction = "init" | "sign" | "retry" | null;

type UseEmployeeReportSyncActionsInput = {
  validIdentity: boolean;
  debugMode: boolean;
  canUseForceSync: boolean;
  forceSyncRemainingSec: number;
  pendingSignForceRefresh: boolean;
  reportData: EmployeeReportResponse | null;
  getIdentityPayload: () => IdentityInput;
  setHasAuthAttempt: (next: boolean) => void;
  setError: (next: string) => void;
  setNotice: (next: string) => void;
  setAdminOnlyReportBlocked: (next: boolean) => void;
  beginBusy: (message: string, hint?: BusyHint) => void;
  updateBusy: (input: { message?: string; hint?: BusyHint }) => void;
  endBusy: () => void;
  clearLocalIdentityCache: () => void;
  syncEmployeeReport: (
    forceRefresh?: boolean,
    options?: { debugOverride?: boolean }
  ) => Promise<EmployeeSyncResponse>;
  tryLoadExistingReport: (options?: {
    successNotice?: string;
    showNotFoundNotice?: boolean;
  }) => Promise<boolean>;
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

export function useEmployeeReportSyncActions({
  validIdentity,
  debugMode,
  canUseForceSync,
  forceSyncRemainingSec,
  pendingSignForceRefresh,
  reportData,
  getIdentityPayload,
  setHasAuthAttempt,
  setError,
  setNotice,
  setAdminOnlyReportBlocked,
  beginBusy,
  updateBusy,
  endBusy,
  clearLocalIdentityCache,
  syncEmployeeReport,
  tryLoadExistingReport,
  clearSyncFlowState,
  setPendingSignGuidance,
  applyForceSyncCooldown,
  emitB2bSessionSync,
  emitNhisSync,
}: UseEmployeeReportSyncActionsInput) {
  const ensureNhisReadyForSync = useCallback(
    async (options?: { forceInit?: boolean }) =>
      ensureNhisReadyForSyncFlow({
        getIdentityPayload,
        forceInit: options?.forceInit,
      }),
    [getIdentityPayload]
  );

  const handleRestartAuth = useEmployeeReportRestartAuthAction({
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
  });

  const handleSignAndSync = useEmployeeReportSignSyncAction({
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
  });

  return {
    handleRestartAuth,
    handleSignAndSync,
  };
}
