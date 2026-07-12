"use client";

import { useCallback } from "react";
import { fetchEmployeeWorkspace } from "./api";
import type { EmployeeWorkspaceResponse } from "./client-types";

type UseEmployeeReportReportLoadingInput = {
  setWorkspace: (next: EmployeeWorkspaceResponse | null) => void;
  setSelectedReportId: (next: string | null) => void;
  setPolling: (next: boolean) => void;
  setPollingError: (next: string) => void;
  setShowSurvey: (next: boolean) => void;
};

export function useEmployeeReportReportLoading({
  setWorkspace,
  setSelectedReportId,
  setPolling,
  setPollingError,
  setShowSurvey,
}: UseEmployeeReportReportLoadingInput) {
  const applyWorkspace = useCallback(
    (
      next: EmployeeWorkspaceResponse | null,
      options?: { preserveSurvey?: boolean }
    ) => {
      setWorkspace(next);
      setSelectedReportId(next?.selectedReportId ?? null);
      setPolling(next?.sync?.active === true);
      if (
        !options?.preserveSurvey &&
        next?.currentStatus?.hasAnyWorkspaceData === true
      ) {
        setShowSurvey(false);
      }
    },
    [setPolling, setSelectedReportId, setShowSurvey, setWorkspace]
  );

  const loadWorkspace = useCallback(
    async (input?: {
      reportId?: string | null;
      preserveSurvey?: boolean;
      driveSync?: boolean;
    }) => {
      const next = await fetchEmployeeWorkspace({
        reportId: input?.reportId ?? undefined,
        driveSync: input?.driveSync,
      });
      setPollingError("");
      applyWorkspace(next, { preserveSurvey: input?.preserveSurvey });
      return next;
    },
    [applyWorkspace, setPollingError]
  );

  return { applyWorkspace, loadWorkspace };
}
