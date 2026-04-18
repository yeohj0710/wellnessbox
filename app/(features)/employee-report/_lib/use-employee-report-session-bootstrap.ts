"use client";

import { useCallback, type MutableRefObject } from "react";
import { fetchEmployeeSession, upsertEmployeeSession } from "./api";
import type {
  EmployeeSessionGetResponse,
  EmployeeSessionUpsertResponse,
  IdentityInput,
} from "./client-types";
import {
  readStoredIdentityWithSource,
  saveStoredIdentity,
} from "./client-utils.identity";

type StoredIdentitySource = "none" | "v2" | "legacy" | "expired" | "invalid";

type UseEmployeeReportSessionBootstrapInput = {
  adminOnlyNotice: string;
  isAdminLoggedIn: boolean;
  hasTriedStoredLoginRef: MutableRefObject<boolean>;
  setBooting: (next: boolean) => void;
  setError: (next: string) => void;
  setIdentity: (next: IdentityInput) => void;
  setNotice: (next: string) => void;
  setStoredIdentitySource: (next: StoredIdentitySource) => void;
  loadReport: (periodKey?: string) => Promise<void>;
  applyMissingReportState: (notice?: string) => void;
  applyAdminOnlyBlockedState: (notice: string) => void;
  clearSyncFlowState: () => void;
  clearLocalIdentityCache: () => void;
  emitB2bSessionSync: (reason: string) => void;
};

export function useEmployeeReportSessionBootstrap({
  adminOnlyNotice,
  isAdminLoggedIn,
  hasTriedStoredLoginRef,
  setBooting,
  setError,
  setIdentity,
  setNotice,
  setStoredIdentitySource,
  loadReport,
  applyMissingReportState,
  applyAdminOnlyBlockedState,
  clearSyncFlowState,
  clearLocalIdentityCache,
  emitB2bSessionSync,
}: UseEmployeeReportSessionBootstrapInput) {
  return useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setBooting(true);
      }
      try {
        const session: EmployeeSessionGetResponse = await fetchEmployeeSession();

        if (session.authenticated) {
          if (session.employee) {
            const sessionIdentity = {
              name: session.employee.name,
              birthDate: session.employee.birthDate,
              phone: session.employee.phoneNormalized,
            };
            setIdentity(sessionIdentity);
            saveStoredIdentity(sessionIdentity);
            setStoredIdentitySource("v2");
          }
          if (!session.latestReport) {
            applyMissingReportState(
              "이전에 확인한 리포트가 없어 다시 본인 확인이 필요합니다."
            );
            return;
          }
          if (!isAdminLoggedIn) {
            applyAdminOnlyBlockedState(adminOnlyNotice);
            return;
          }
          await loadReport();
          return;
        }

        if (!hasTriedStoredLoginRef.current) {
          hasTriedStoredLoginRef.current = true;
          const storedResult = readStoredIdentityWithSource();
          setStoredIdentitySource(storedResult.source);
          const stored = storedResult.identity;
          if (stored) {
            setIdentity(stored);
            const loginResult: EmployeeSessionUpsertResponse =
              await upsertEmployeeSession(stored);
            if (loginResult.found) {
              saveStoredIdentity(stored);
              setStoredIdentitySource("v2");
              emitB2bSessionSync("employee-report-auto-login");
              if (!loginResult.hasReport) {
                applyMissingReportState(
                  loginResult.message ||
                    "이전에 확인한 리포트가 없어 다시 본인 확인이 필요합니다."
                );
                return;
              }
              setNotice("이전에 입력한 정보로 다시 연결했어요.");
              clearSyncFlowState();
              await loadReport();
              return;
            }
            clearLocalIdentityCache();
          }
        }

        applyMissingReportState();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "확인 중 문제가 발생했습니다.";
        setError(message);
      } finally {
        if (!options?.silent) {
          setBooting(false);
        }
      }
    },
    [
      adminOnlyNotice,
      applyAdminOnlyBlockedState,
      applyMissingReportState,
      clearLocalIdentityCache,
      clearSyncFlowState,
      emitB2bSessionSync,
      hasTriedStoredLoginRef,
      isAdminLoggedIn,
      loadReport,
      setBooting,
      setError,
      setIdentity,
      setNotice,
      setStoredIdentitySource,
    ]
  );
}
