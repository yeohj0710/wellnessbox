"use client";

import { useCallback } from "react";
import { emitAuthSyncEvent } from "@/lib/client/auth-sync";
import { fetchEmployeeSession, upsertEmployeeSession } from "./api";
import type { EmployeeWorkspaceResponse, IdentityInput } from "./client-types";
import {
  readStoredIdentityWithSource,
  saveStoredIdentity,
} from "./client-utils.identity";

type UseEmployeeReportSessionBootstrapInput = {
  loadWorkspace: () => Promise<EmployeeWorkspaceResponse>;
  onWorkspaceLoaded: (workspace: EmployeeWorkspaceResponse) => void;
  setBooting: (next: boolean) => void;
  setError: (next: string) => void;
  setIdentity: (next: IdentityInput) => void;
};

export function useEmployeeReportSessionBootstrap({
  loadWorkspace,
  onWorkspaceLoaded,
  setBooting,
  setError,
  setIdentity,
}: UseEmployeeReportSessionBootstrapInput) {
  return useCallback(async () => {
    try {
      const session = await fetchEmployeeSession();

      if (session.authenticated && session.employee) {
        const sessionIdentity = {
          name: session.employee.name,
          birthDate: session.employee.birthDate,
          phone: session.employee.phoneNormalized,
        };
        setIdentity(sessionIdentity);
        saveStoredIdentity(sessionIdentity);
        onWorkspaceLoaded(await loadWorkspace());
        return;
      }

      const stored = readStoredIdentityWithSource().identity;
      if (!stored) return;

      setIdentity(stored);
      const loginResult = await upsertEmployeeSession(stored).catch(() => null);
      if (!loginResult?.found) return;

      saveStoredIdentity(stored);
      emitAuthSyncEvent({
        scope: "b2b-employee-session",
        reason: "employee-report-auto-login",
      });
      onWorkspaceLoaded(await loadWorkspace());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "리포트 상태를 불러오지 못했습니다."
      );
    } finally {
      setBooting(false);
    }
  }, [loadWorkspace, onWorkspaceLoaded, setBooting, setError, setIdentity]);
}
