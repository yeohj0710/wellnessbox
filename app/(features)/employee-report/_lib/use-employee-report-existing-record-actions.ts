"use client";

import { useCallback } from "react";
import { emitAuthSyncEvent } from "@/lib/client/auth-sync";
import { deleteEmployeeSession } from "./api";
import type { EmployeeWorkspaceResponse, IdentityInput } from "./client-types";
import { clearStoredIdentity } from "./client-utils.identity";

type UseEmployeeReportExistingRecordActionsInput = {
  clearSurveyDraft: () => void;
  setWorkspace: (next: EmployeeWorkspaceResponse | null) => void;
  setSelectedReportId: (next: string | null) => void;
  setShowSurvey: (next: boolean) => void;
  setShowHealthSyncModal: (next: boolean) => void;
  setPolling: (next: boolean) => void;
  setPollingError: (next: string) => void;
  setOptimisticHealthState: (next: null) => void;
  setNotice: (next: string) => void;
  setError: (next: string) => void;
  setIdentity: (next: IdentityInput) => void;
};

export function useEmployeeReportExistingRecordActions(input: UseEmployeeReportExistingRecordActionsInput) {
  const resetIdentityFlow = useCallback(async () => {
    await deleteEmployeeSession().catch(() => null);
    emitAuthSyncEvent({ scope: "b2b-employee-session", reason: "employee-report-reset" });
    emitAuthSyncEvent({ scope: "nhis-link", reason: "employee-report-reset" });
    clearStoredIdentity();
    input.clearSurveyDraft();
    input.setWorkspace(null);
    input.setSelectedReportId(null);
    input.setShowSurvey(false);
    input.setShowHealthSyncModal(false);
    input.setPolling(false);
    input.setPollingError("");
    input.setOptimisticHealthState(null);
    input.setNotice("");
    input.setError("");
    input.setIdentity({ name: "", birthDate: "", phone: "" });
  }, [input]);

  return { resetIdentityFlow };
}
