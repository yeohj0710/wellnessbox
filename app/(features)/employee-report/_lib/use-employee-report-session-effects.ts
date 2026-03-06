import { useEffect, type MutableRefObject } from "react";
import { subscribeAuthSyncEvent } from "@/lib/client/auth-sync";
import type { EmployeeReportResponse } from "./client-types";

type UseEmployeeReportSessionEffectsInput = {
  adminOnlyReportBlocked: boolean;
  busy: boolean;
  isAdminLoggedIn: boolean;
  reportData: EmployeeReportResponse | null;
  selectedPeriodKey: string;
  hasTriedStoredLoginRef: MutableRefObject<boolean>;
  loadReport: (periodKey?: string) => Promise<void>;
  checkSessionAndMaybeAutoLogin: (options?: { silent?: boolean }) => Promise<void>;
};

export function useEmployeeReportSessionEffects({
  adminOnlyReportBlocked,
  busy,
  isAdminLoggedIn,
  reportData,
  selectedPeriodKey,
  hasTriedStoredLoginRef,
  loadReport,
  checkSessionAndMaybeAutoLogin,
}: UseEmployeeReportSessionEffectsInput) {
  useEffect(() => {
    if (!isAdminLoggedIn || !adminOnlyReportBlocked || busy) return;
    void checkSessionAndMaybeAutoLogin({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminOnlyReportBlocked, busy, isAdminLoggedIn]);

  useEffect(() => {
    const unsubscribe = subscribeAuthSyncEvent(
      (detail) => {
        if (busy) return;

        if (detail.scope === "nhis-link") {
          if (!reportData) return;
          void loadReport(selectedPeriodKey || undefined).catch(() => null);
          return;
        }

        hasTriedStoredLoginRef.current = false;
        void checkSessionAndMaybeAutoLogin({ silent: true });
      },
      { scopes: ["user-session", "b2b-employee-session", "nhis-link"] }
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, reportData, selectedPeriodKey]);
}
