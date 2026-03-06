import { useEffect, useRef } from "react";

type UseB2bAdminBackgroundRefreshParams = {
  busy: boolean;
  hasUnsavedDraft: boolean;
  isDetailLoading: boolean;
  loadEmployeeDetail: (employeeId: string, periodKey?: string) => Promise<void>;
  loadEmployees: (query?: string) => Promise<void>;
  searchQuery: string;
  selectedEmployeeId: string | null;
  selectedPeriodKey: string;
  minIntervalMs?: number;
  interactionQuietMs?: number;
};

const DEFAULT_MIN_INTERVAL_MS = 15_000;
const DEFAULT_INTERACTION_QUIET_MS = 8_000;

export function useB2bAdminBackgroundRefresh({
  busy,
  hasUnsavedDraft,
  interactionQuietMs = DEFAULT_INTERACTION_QUIET_MS,
  isDetailLoading,
  loadEmployeeDetail,
  loadEmployees,
  minIntervalMs = DEFAULT_MIN_INTERVAL_MS,
  searchQuery,
  selectedEmployeeId,
  selectedPeriodKey,
}: UseB2bAdminBackgroundRefreshParams) {
  const inFlightRef = useRef(false);
  const lastBackgroundRefreshAtRef = useRef(0);
  const lastInteractionAtRef = useRef(Date.now());

  useEffect(() => {
    const markInteraction = () => {
      lastInteractionAtRef.current = Date.now();
    };

    const events = ["pointerdown", "keydown", "input", "compositionstart"];
    for (const eventName of events) {
      document.addEventListener(eventName, markInteraction, { capture: true, passive: true });
    }

    return () => {
      for (const eventName of events) {
        document.removeEventListener(eventName, markInteraction, { capture: true });
      }
    };
  }, []);

  useEffect(() => {
    const refreshFromServer = () => {
      if (busy || isDetailLoading || hasUnsavedDraft || inFlightRef.current) return;

      const now = Date.now();
      if (now - lastBackgroundRefreshAtRef.current < minIntervalMs) return;
      if (now - lastInteractionAtRef.current < interactionQuietMs) return;

      inFlightRef.current = true;
      lastBackgroundRefreshAtRef.current = now;
      void (async () => {
        try {
          const tasks: Array<Promise<unknown>> = [loadEmployees(searchQuery.trim())];
          if (selectedEmployeeId) {
            tasks.push(loadEmployeeDetail(selectedEmployeeId, selectedPeriodKey || undefined));
          }
          await Promise.all(tasks);
        } finally {
          inFlightRef.current = false;
        }
      })();
    };

    const handleFocus = () => {
      refreshFromServer();
    };
    const handleVisibilityChange = () => {
      if (!document.hidden) refreshFromServer();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    busy,
    hasUnsavedDraft,
    interactionQuietMs,
    isDetailLoading,
    loadEmployeeDetail,
    loadEmployees,
    minIntervalMs,
    searchQuery,
    selectedEmployeeId,
    selectedPeriodKey,
  ]);
}
