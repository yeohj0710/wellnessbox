"use client";

import { useCallback } from "react";
import { upsertEmployeeSession } from "./api";
import type { IdentityInput } from "./client-types";
import { saveStoredIdentity } from "./client-utils";

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

    beginBusy("기존 조회 기록을 확인하고 있어요.");
    setError("");
    setNotice("");

    try {
      const response = await upsertAndLoadExistingReport("employee-report-find-existing");

      if (response.status === "not-found") {
        applyMissingReportState(
          response.result.message ||
            "조회 가능한 기록이 없습니다. 카카오 인증 후 연동을 진행해 주세요."
        );
        return;
      }

      if (response.status === "no-report") {
        applyMissingReportState(
          response.result.message ||
            "저장된 리포트가 없어 다시 인증 후 연동이 필요합니다."
        );
        return;
      }

      if (response.status === "loaded") {
        setNotice("기존 레포트를 불러왔습니다.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "기존 정보 조회에 실패했습니다."
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
              "조회 가능한 기록이 없어 카카오 인증 후 연동이 필요합니다."
          );
        }
        return false;
      }

      if (response.status === "no-report") {
        applyMissingReportState();
        if (options?.showNotFoundNotice) {
          setNotice(
            response.result.message ||
              "저장된 리포트가 없어 다시 인증 후 연동이 필요합니다."
          );
        }
        return false;
      }

      if (response.status === "loaded") {
        setNotice(options?.successNotice || "기존 레포트를 불러왔어요.");
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
