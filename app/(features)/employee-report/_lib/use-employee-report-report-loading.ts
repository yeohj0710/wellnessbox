"use client";

import { useCallback } from "react";
import { deleteEmployeeSession, fetchEmployeeReport } from "./api";
import type {
  ApiErrorPayload,
  EmployeeReportResponse,
  IdentityInput,
} from "./client-types";
import { saveStoredIdentity } from "./client-utils.identity";
import { ApiRequestError } from "./client-utils.request";
import { syncEmployeeReportAndReload as syncEmployeeReportAndReloadFlow } from "./sync-flow";

type UseEmployeeReportReportLoadingInput = {
  validIdentity: boolean;
  identityPayload: IdentityInput;
  selectedPeriodKey: string;
  adminOnlyCode: string;
  adminOnlyNotice: string;
  clearLocalIdentityCache: () => void;
  applyAdminOnlyBlockedState: (notice: string) => void;
  resetReportState: () => void;
  setAdminOnlyReportBlocked: (next: boolean) => void;
  setReportData: (next: EmployeeReportResponse | null) => void;
  setSelectedPeriodKey: (next: string) => void;
  setError: (next: string) => void;
  setStoredIdentitySource: (
    next: "none" | "v2" | "legacy" | "expired" | "invalid"
  ) => void;
  applyForceSyncCooldown: (payload: ApiErrorPayload | null | undefined) => void;
};

export function useEmployeeReportReportLoading({
  validIdentity,
  identityPayload,
  selectedPeriodKey,
  adminOnlyCode,
  adminOnlyNotice,
  clearLocalIdentityCache,
  applyAdminOnlyBlockedState,
  resetReportState,
  setAdminOnlyReportBlocked,
  setReportData,
  setSelectedPeriodKey,
  setError,
  setStoredIdentitySource,
  applyForceSyncCooldown,
}: UseEmployeeReportReportLoadingInput) {
  const loadReport = useCallback(
    async (periodKey?: string) => {
      try {
        const data = await fetchEmployeeReport(periodKey);
        if (!data.ok) {
          throw new Error(data.error || "리포트 조회에 실패했습니다.");
        }
        if (!data.report) {
          resetReportState();
          return;
        }
        setAdminOnlyReportBlocked(false);
        setReportData(data);
        setSelectedPeriodKey(data.periodKey || periodKey || "");
        setError("");
        if (validIdentity) {
          saveStoredIdentity(identityPayload);
          setStoredIdentitySource("v2");
        }
      } catch (err) {
        if (
          err instanceof ApiRequestError &&
          err.status === 403 &&
          err.payload.code === adminOnlyCode
        ) {
          applyAdminOnlyBlockedState(adminOnlyNotice);
          return;
        }
        if (
          err instanceof ApiRequestError &&
          (err.status === 401 || err.status === 404)
        ) {
          await deleteEmployeeSession().catch(() => null);
          clearLocalIdentityCache();
          resetReportState();
        }
        throw err;
      }
    },
    [
      adminOnlyCode,
      adminOnlyNotice,
      applyAdminOnlyBlockedState,
      clearLocalIdentityCache,
      identityPayload,
      resetReportState,
      setAdminOnlyReportBlocked,
      setError,
      setReportData,
      setSelectedPeriodKey,
      setStoredIdentitySource,
      validIdentity,
    ]
  );

  const syncEmployeeReport = useCallback(
    async (forceRefresh = false, options?: { debugOverride?: boolean }) =>
      syncEmployeeReportAndReloadFlow({
        getIdentityPayload: () => identityPayload,
        forceRefresh,
        debugOverride: options?.debugOverride,
        selectedPeriodKey,
        loadReport,
        applyForceSyncCooldown,
        persistIdentity: saveStoredIdentity,
      }),
    [applyForceSyncCooldown, identityPayload, loadReport, selectedPeriodKey]
  );

  return {
    loadReport,
    syncEmployeeReport,
  };
}
