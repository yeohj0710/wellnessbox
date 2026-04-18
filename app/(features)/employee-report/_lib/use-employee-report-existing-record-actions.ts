"use client";

import { useCallback } from "react";
import { upsertEmployeeSession } from "./api";
import type { IdentityInput } from "./client-types";
import { saveStoredIdentity } from "./client-utils.identity";

type TryLoadExistingOptions = {
  successNotice?: string;
  showNotFoundNotice?: boolean;
};

type UseEmployeeReportExistingRecordActionsInput = {
  validIdentity: boolean;
  isAdminLoggedIn: boolean;
  adminOnlyNotice: string;
  getIdentityPayload: () => IdentityInput;
  beginBusy: (message: string) => void;
  endBusy: () => void;
  loadReport: (periodKey?: string) => Promise<void>;
  setError: (next: string) => void;
  setNotice: (next: string) => void;
  setStoredIdentitySource: (
    next: "none" | "v2" | "legacy" | "expired" | "invalid"
  ) => void;
  clearLocalIdentityCache: () => void;
  applyMissingReportState: (notice?: string) => void;
  applyAdminOnlyBlockedState: (notice: string) => void;
  clearSyncFlowState: () => void;
  emitB2bSessionSync: (reason: string) => void;
};

export function useEmployeeReportExistingRecordActions({
  validIdentity,
  isAdminLoggedIn,
  adminOnlyNotice,
  getIdentityPayload,
  beginBusy,
  endBusy,
  loadReport,
  setError,
  setNotice,
  setStoredIdentitySource,
  clearLocalIdentityCache,
  applyMissingReportState,
  applyAdminOnlyBlockedState,
  clearSyncFlowState,
  emitB2bSessionSync,
}: UseEmployeeReportExistingRecordActionsInput) {
  const upsertAndLoadExistingReport = useCallback(
    async (
      syncReason: "employee-report-find-existing" | "employee-report-try-load-existing"
    ) => {
      const payload = getIdentityPayload();
      const result = await upsertEmployeeSession(payload);

      if (!result.found) {
        clearLocalIdentityCache();
        return { status: "not-found" as const, result };
      }

      saveStoredIdentity(payload);
      setStoredIdentitySource("v2");
      emitB2bSessionSync(syncReason);

      if (!result.hasReport) {
        return { status: "no-report" as const, result };
      }

      if (!isAdminLoggedIn) {
        applyAdminOnlyBlockedState(adminOnlyNotice);
        return { status: "blocked" as const, result };
      }

      clearSyncFlowState();
      await loadReport();
      return { status: "loaded" as const, result };
    },
    [
      adminOnlyNotice,
      applyAdminOnlyBlockedState,
      clearLocalIdentityCache,
      clearSyncFlowState,
      emitB2bSessionSync,
      getIdentityPayload,
      isAdminLoggedIn,
      loadReport,
      setStoredIdentitySource,
    ]
  );

  const handleFindExisting = useCallback(async () => {
    if (!validIdentity) {
      setError("이름, 생년월일(8자리), 휴대폰 번호를 정확히 입력해 주세요.");
      return;
    }

    beginBusy("이전에 확인한 내용을 찾고 있어요.");
    setError("");
    setNotice("");

    try {
      const response = await upsertAndLoadExistingReport("employee-report-find-existing");

      if (response.status === "not-found") {
        applyMissingReportState(
          response.result.message ||
            "바로 확인할 수 있는 기록이 없어요. 카카오 인증 후 새로 확인해 주세요."
        );
        return;
      }

      if (response.status === "no-report") {
        applyMissingReportState(
          response.result.message ||
            "이전에 확인한 리포트가 없어 다시 본인 확인이 필요합니다."
        );
        return;
      }

      if (response.status === "loaded") {
        setNotice("이전에 확인한 리포트를 불러왔어요.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "이전 정보를 확인하지 못했습니다."
      );
    } finally {
      endBusy();
    }
  }, [
    applyMissingReportState,
    beginBusy,
    endBusy,
    setError,
    setNotice,
    upsertAndLoadExistingReport,
    validIdentity,
  ]);

  const tryLoadExistingReport = useCallback(
    async (options?: TryLoadExistingOptions) => {
      const response = await upsertAndLoadExistingReport(
        "employee-report-try-load-existing"
      );

      if (response.status === "not-found") {
        applyMissingReportState();
        if (options?.showNotFoundNotice) {
          setNotice(
            response.result.message ||
              "바로 확인할 수 있는 기록이 없어 카카오 인증 후 새로 확인해 주세요."
          );
        }
        return false;
      }

      if (response.status === "no-report") {
        applyMissingReportState();
        if (options?.showNotFoundNotice) {
          setNotice(
            response.result.message ||
              "이전에 확인한 리포트가 없어 다시 본인 확인이 필요합니다."
          );
        }
        return false;
      }

      if (response.status === "loaded") {
        setNotice(options?.successNotice || "이전에 확인한 리포트를 불러왔어요.");
      }
      return true;
    },
    [applyMissingReportState, setNotice, upsertAndLoadExistingReport]
  );

  return {
    handleFindExisting,
    tryLoadExistingReport,
  };
}
