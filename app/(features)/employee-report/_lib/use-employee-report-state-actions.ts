import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  EmployeeReportResponse,
  SyncGuidance,
} from "./client-types";

type SyncNextAction = "init" | "sign" | "retry" | null;

type UseEmployeeReportStateActionsParams = {
  setAdminOnlyReportBlocked: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
  setPendingSignForceRefresh: Dispatch<SetStateAction<boolean>>;
  setReportData: Dispatch<SetStateAction<EmployeeReportResponse | null>>;
  setSelectedPeriodKey: Dispatch<SetStateAction<string>>;
  setSyncGuidance: Dispatch<SetStateAction<SyncGuidance | null>>;
  setSyncNextAction: Dispatch<SetStateAction<SyncNextAction>>;
};

export function useEmployeeReportStateActions({
  setAdminOnlyReportBlocked,
  setError,
  setNotice,
  setPendingSignForceRefresh,
  setReportData,
  setSelectedPeriodKey,
  setSyncGuidance,
  setSyncNextAction,
}: UseEmployeeReportStateActionsParams) {
  const clearSyncFlowState = useCallback(
    (options?: {
      nextAction?: SyncNextAction;
      guidance?: SyncGuidance | null;
      pendingSignForceRefresh?: boolean;
    }) => {
      setSyncNextAction(options?.nextAction ?? null);
      setSyncGuidance(options?.guidance ?? null);
      setPendingSignForceRefresh(options?.pendingSignForceRefresh ?? false);
    },
    [setPendingSignForceRefresh, setSyncGuidance, setSyncNextAction]
  );

  const resetReportState = useCallback(() => {
    setReportData(null);
    setSelectedPeriodKey("");
    setAdminOnlyReportBlocked(false);
  }, [setAdminOnlyReportBlocked, setReportData, setSelectedPeriodKey]);

  const applyMissingReportState = useCallback(
    (notice?: string) => {
      resetReportState();
      clearSyncFlowState({ nextAction: "init" });
      if (notice) {
        setNotice(notice);
      }
    },
    [clearSyncFlowState, resetReportState, setNotice]
  );

  const applyAdminOnlyBlockedState = useCallback(
    (notice: string) => {
      setAdminOnlyReportBlocked(true);
      setReportData(null);
      setSelectedPeriodKey("");
      clearSyncFlowState();
      setError("");
      setNotice(notice);
    },
    [
      clearSyncFlowState,
      setAdminOnlyReportBlocked,
      setError,
      setNotice,
      setReportData,
      setSelectedPeriodKey,
    ]
  );

  const setPendingSignGuidance = useCallback(
    (message: string, forceRefresh = false) => {
      setPendingSignForceRefresh(forceRefresh);
      setSyncNextAction("sign");
      setSyncGuidance({
        nextAction: "sign",
        message,
      });
    },
    [setPendingSignForceRefresh, setSyncGuidance, setSyncNextAction]
  );

  return {
    applyAdminOnlyBlockedState,
    applyMissingReportState,
    clearSyncFlowState,
    resetReportState,
    setPendingSignGuidance,
  };
}
