"use client";

import { useEffect } from "react";
import { subscribeAuthSyncEvent } from "@/lib/client/auth-sync";

type UseEmployeeReportSessionEffectsInput = {
  busy: boolean;
  hasWorkspace: boolean;
  loadWorkspace: () => Promise<unknown>;
  checkSessionAndMaybeAutoLogin: () => Promise<void>;
};

export function useEmployeeReportSessionEffects({
  busy,
  hasWorkspace,
  loadWorkspace,
  checkSessionAndMaybeAutoLogin,
}: UseEmployeeReportSessionEffectsInput) {
  useEffect(() => {
    return subscribeAuthSyncEvent(
      (detail) => {
        if (busy) return;

        if (detail.scope === "nhis-link" && hasWorkspace) {
          void loadWorkspace().catch(() => null);
          return;
        }

        void checkSessionAndMaybeAutoLogin();
      },
      { scopes: ["user-session", "b2b-employee-session", "nhis-link"] }
    );
  }, [busy, checkSessionAndMaybeAutoLogin, hasWorkspace, loadWorkspace]);
}
